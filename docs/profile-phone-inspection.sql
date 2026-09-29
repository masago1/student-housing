-- Read-only: run this first and review the results before the setup migration.
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'profiles';

SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass;

SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS trigger_definition,
       pg_get_functiondef(tgfoid) AS function_definition
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal;

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone';
