-- Review profile-phone-inspection.sql results first. Execute in SQL Editor.
-- Existing profile triggers and indexes are retained, never disabled or dropped.
BEGIN;
LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;

-- Migrate only the old supported Romanian mobile format and international values.
-- This is a legacy data migration, not country validation for new UI input.
CREATE TEMP TABLE shaus_phone_migration ON COMMIT DROP AS
WITH compact AS (
  SELECT id, phone AS old_phone,
    regexp_replace(btrim(coalesce(phone, '')), '[[:space:]().-]', '', 'g') AS digits
  FROM public.profiles
)
SELECT id, old_phone,
  CASE
    WHEN digits = '' THEN NULL
    WHEN digits ~ '^07[0-9]{8}$' THEN '+40' || substring(digits FROM 2)
    WHEN digits ~ '^00[1-9][0-9]{1,14}$' THEN '+' || substring(digits FROM 3)
    WHEN digits ~ '^\+[1-9][0-9]{1,14}$' THEN digits
    ELSE 'INVALID'
  END AS normalized_phone
FROM compact;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM shaus_phone_migration WHERE normalized_phone = 'INVALID') THEN
    RAISE EXCEPTION 'Unrecognized existing phone values: review them before migration.';
  END IF;
  IF EXISTS (
    SELECT normalized_phone FROM shaus_phone_migration
    WHERE normalized_phone IS NOT NULL GROUP BY normalized_phone HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existing profiles share a normalized phone. Resolve ownership before migration.';
  END IF;
END $$;

-- Any incompatible existing trigger/check causes a full rollback for review.
UPDATE public.profiles AS p SET phone = m.normalized_phone
FROM shaus_phone_migration AS m
WHERE p.id = m.id AND p.phone IS DISTINCT FROM m.normalized_phone;

-- Reuse an existing single-column phone unique index/constraint, including one
-- excluding NULLs. Otherwise add the index. Unique enforcement handles races.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index AS i
    JOIN pg_attribute AS a ON a.attrelid = i.indrelid AND a.attname = 'phone'
    WHERE i.indrelid = 'public.profiles'::regclass
      AND i.indisunique AND i.indisvalid AND i.indisready
      AND i.indnkeyatts = 1 AND i.indkey[0] = a.attnum
      AND (i.indpred IS NULL OR
        regexp_replace(pg_get_expr(i.indpred, i.indrelid), '[[:space:]()]', '', 'g') = 'phoneISNOTNULL')
  ) THEN
    CREATE UNIQUE INDEX profiles_phone_e164_unique ON public.profiles (phone);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_phone_e164_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_e164_check
      CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{1,14}$');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guard_profile_phone_once()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- Prevent a client from clearing the one-time choice by deleting/recreating
  -- its profile. The existing service-role account deletion flow still works.
  IF TG_OP = 'DELETE' THEN
    IF OLD.phone IS NOT NULL AND current_user IN ('anon', 'authenticated') THEN
      RAISE EXCEPTION 'profile_phone_immutable' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.phone IS NOT NULL AND NEW.phone IS DISTINCT FROM OLD.phone THEN
    RAISE EXCEPTION 'profile_phone_immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_profile_phone_once() FROM PUBLIC, anon, authenticated;

-- Keep other profile triggers. If the inspected schema already has equivalent
-- phone immutability, reuse it instead of installing this additional guard.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'profile_phone_once') THEN
    CREATE TRIGGER profile_phone_once BEFORE UPDATE OR DELETE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.guard_profile_phone_once();
  END IF;
END $$;

-- A narrow authenticated check works even with owner-only profile RLS.
-- The caller supplies no account ID, and no phone numbers or profile IDs return.
CREATE OR REPLACE FUNCTION public.profile_phone_taken(candidate_phone text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF candidate_phone IS NULL OR candidate_phone !~ '^\+[1-9][0-9]{1,14}$' THEN
    RAISE EXCEPTION 'Invalid phone format';
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles AS p
    WHERE p.phone = candidate_phone AND p.id <> auth.uid());
END $$;
ALTER FUNCTION public.profile_phone_taken(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.profile_phone_taken(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.profile_phone_taken(text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
