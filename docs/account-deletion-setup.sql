-- REVIEW AND APPLY MANUALLY in Supabase SQL Editor before enabling the endpoint.
-- Not executed by the application. Existing grants/permissive policies are retained.
BEGIN;

-- Fail closed if the assumed existing RLS protection is missing. This script
-- adds restrictive policies; it does not replace existing ownership policies.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE ((n.nspname = 'public' AND c.relname IN ('profiles', 'listings',
      'listing_images', 'listing_universities', 'favorites', 'conversations', 'messages'))
      OR (n.nspname = 'storage' AND c.relname = 'objects')) AND NOT c.relrowsecurity
  ) THEN RAISE EXCEPTION 'Review and enable existing table RLS before applying deletion setup'; END IF;
END;
$$;

CREATE TABLE public.account_deletion_requests (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

-- Check live account existence, not just the signature of an unexpired JWT.
CREATE FUNCTION public.account_access_allowed()
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM public.account_deletion_requests d WHERE d.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.account_access_allowed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_access_allowed() TO authenticated;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles', 'listings', 'listing_images',
    'listing_universities', 'favorites', 'conversations', 'messages']
  LOOP
    EXECUTE format('CREATE POLICY account_deletion_access_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.account_access_allowed())) WITH CHECK ((SELECT public.account_access_allowed()))', table_name);
  END LOOP;
END;
$$;
CREATE POLICY account_deletion_storage_guard ON storage.objects
AS RESTRICTIVE FOR ALL TO authenticated
USING (bucket_id <> 'listing-images' OR (SELECT public.account_access_allowed()))
WITH CHECK (bucket_id <> 'listing-images' OR (SELECT public.account_access_allowed()));

-- Other participants must not recreate dependencies on an account being deleted.
-- This guard leaves ordinary inserts/updates and all deletes unchanged.
CREATE FUNCTION public.guard_account_deletion_references()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  record_data jsonb := to_jsonb(NEW);
  candidate uuid;
  related_listing uuid;
  related_conversation uuid;
  account_ids uuid[] := ARRAY[]::uuid[];
  field_name text;
BEGIN
  FOREACH field_name IN ARRAY ARRAY['user_id', 'sender_id', 'tenant_id', 'owner_id'] LOOP
    candidate := NULLIF(record_data ->> field_name, '')::uuid;
    IF candidate IS NOT NULL THEN account_ids := array_append(account_ids, candidate); END IF;
  END LOOP;
  IF TG_TABLE_NAME = 'profiles' THEN
    account_ids := array_append(account_ids, (record_data ->> 'id')::uuid);
  END IF;
  related_conversation := NULLIF(record_data ->> 'conversation_id', '')::uuid;
  IF related_conversation IS NOT NULL THEN
    SELECT account_ids || ARRAY[c.owner_id, c.tenant_id], c.listing_id
      INTO account_ids, related_listing
      FROM public.conversations c WHERE c.id = related_conversation;
    IF NOT FOUND THEN RAISE EXCEPTION 'Conversation unavailable' USING ERRCODE = '23503'; END IF;
  ELSE
    related_listing := NULLIF(record_data ->> 'listing_id', '')::uuid;
  END IF;
  IF related_listing IS NOT NULL THEN
    SELECT l.user_id INTO candidate FROM public.listings l WHERE l.id = related_listing;
    IF NOT FOUND THEN RAISE EXCEPTION 'Listing unavailable' USING ERRCODE = '23503'; END IF;
    account_ids := array_append(account_ids, candidate);
  END IF;
  IF EXISTS (SELECT 1 FROM public.account_deletion_requests d WHERE d.user_id = ANY(account_ids)) THEN
    RAISE EXCEPTION 'Account deletion in progress' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_account_deletion_references() FROM PUBLIC, anon, authenticated;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles', 'listings', 'listing_images',
    'listing_universities', 'favorites', 'conversations', 'messages']
  LOOP
    EXECUTE format('CREATE TRIGGER account_deletion_reference_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_account_deletion_references()', table_name);
  END LOOP;
END;
$$;

CREATE FUNCTION public.prepare_account_deletion(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Drain in-flight writes before installing the deletion marker. Short transaction;
  -- network/Storage deletion is NOT performed while these table locks are held.
  LOCK TABLE public.profiles, public.listings, public.listing_images,
    public.listing_universities, public.favorites, public.conversations,
    public.messages, storage.objects IN SHARE ROW EXCLUSIVE MODE;
  PERFORM 1 FROM auth.users WHERE id = target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable'; END IF;
  -- Never delete another owner's path. Legacy non-prefix paths require manual review.
  IF EXISTS (
    SELECT 1 FROM public.listing_images i JOIN public.listings l ON l.id = i.listing_id
    WHERE l.user_id = target_user_id AND NULLIF(i.storage_path, '') IS NOT NULL
      AND left(i.storage_path, length(target_user_id::text) + 1) <> target_user_id::text || '/'
  ) THEN RAISE EXCEPTION 'Legacy image paths require review'; END IF;
  -- owner_id is the current Supabase Storage ownership field; verify in preflight.
  IF EXISTS (
    SELECT 1 FROM storage.objects o WHERE o.owner_id = target_user_id::text
      AND (o.bucket_id <> 'listing-images' OR left(o.name, length(target_user_id::text) + 1) <> target_user_id::text || '/')
  ) THEN RAISE EXCEPTION 'Unexpected owned storage objects require review'; END IF;
  IF EXISTS (
    SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'listing-images'
      AND left(o.name, length(target_user_id::text) + 1) = target_user_id::text || '/'
      AND NULLIF(o.owner_id, '') IS NOT NULL AND o.owner_id <> target_user_id::text
  ) THEN RAISE EXCEPTION 'Conflicting storage ownership requires review'; END IF;
  INSERT INTO public.account_deletion_requests(user_id) VALUES (target_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE FUNCTION public.purge_account_data(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.account_deletion_requests WHERE user_id = target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deletion was not prepared'; END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'listing-images'
    AND left(name, length(target_user_id::text) + 1) = target_user_id::text || '/') THEN
    RAISE EXCEPTION 'Storage cleanup incomplete';
  END IF;
  DELETE FROM public.messages m WHERE m.sender_id = target_user_id OR m.conversation_id IN (
    SELECT c.id FROM public.conversations c WHERE c.tenant_id = target_user_id OR c.owner_id = target_user_id
      OR c.listing_id IN (SELECT id FROM public.listings WHERE user_id = target_user_id)
  );
  DELETE FROM public.conversations c WHERE c.tenant_id = target_user_id OR c.owner_id = target_user_id
    OR c.listing_id IN (SELECT id FROM public.listings WHERE user_id = target_user_id);
  DELETE FROM public.favorites f WHERE f.user_id = target_user_id
    OR f.listing_id IN (SELECT id FROM public.listings WHERE user_id = target_user_id);
  DELETE FROM public.listing_images WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = target_user_id);
  DELETE FROM public.listing_universities WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = target_user_id);
  DELETE FROM public.listings WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  -- Auth is deleted last via the Admin API. That removes the request marker via
  -- the explicitly defined FK above. This also keeps failed operations retryable.
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_account_data(uuid) TO service_role;
COMMIT;
