-- Run in the Supabase SQL editor. Replace case-insensitive nickname protection
-- atomically: if index creation fails, the transaction preserves the old indexes.
BEGIN;

DROP INDEX IF EXISTS public.profiles_nickname_unique;
-- Remove the index from the earlier proposed script too, if it was applied.
DROP INDEX IF EXISTS public.profiles_nickname_lower_unique;

CREATE UNIQUE INDEX profiles_nickname_unique
  ON public.profiles (nickname);

COMMIT;
