-- MANUAL REVIEW ONLY. Apply AFTER Stage A, application deployment and tests.
-- Review live policies/functions/views first (see public-listings-privacy.md).
-- Existing INSERT/UPDATE/DELETE policies and grants are not replaced.
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE oid = 'public.listings'::regclass AND relrowsecurity
    ) THEN
        RAISE EXCEPTION 'listings RLS must already be enabled';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname IN ('anon', 'authenticated')
          AND (rolsuper OR rolbypassrls)
    ) THEN
        RAISE EXCEPTION 'API roles must not bypass RLS';
    END IF;
    -- Policies on other tables may read listings to authorize images,
    -- favorites or conversations. Changing listings visibility could break them.
    -- Stop instead of rewriting unknown live policies automatically.
    IF EXISTS (
        SELECT 1
        FROM pg_depend AS d
        JOIN pg_policy AS p ON p.oid = d.objid
        WHERE d.classid = 'pg_policy'::regclass
          AND d.refclassid = 'pg_class'::regclass
          AND d.refobjid = 'public.listings'::regclass
          AND p.polrelid <> 'public.listings'::regclass
    ) THEN
        RAISE EXCEPTION 'Review policies on other tables that depend on listings before Stage B';
    END IF;
END;
$$;

-- Remove table-level and any explicit column-level anonymous SELECT grants.
REVOKE SELECT ON public.listings FROM PUBLIC, anon;
DO $$
DECLARE column_list text;
BEGIN
    SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum)
    INTO column_list
    FROM pg_attribute
    WHERE attrelid = 'public.listings'::regclass
      AND attnum > 0 AND NOT attisdropped;
    EXECUTE format(
        'REVOKE SELECT (%s) ON public.listings FROM PUBLIC, anon', column_list
    );
END;
$$;

-- Even an inherited grant or old permissive policy cannot expose base rows.
CREATE POLICY listings_no_anonymous_base_read
ON public.listings AS RESTRICTIVE FOR SELECT TO anon
USING (false);

GRANT SELECT ON public.listings TO authenticated;
CREATE POLICY listings_owner_read
ON public.listings AS PERMISSIVE FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY listings_owner_read_boundary
ON public.listings AS RESTRICTIVE FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Existing restrictive account-deletion guards continue to apply on the base.
NOTIFY pgrst, 'reload schema';
COMMIT;
