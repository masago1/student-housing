BEGIN;

-- No email addresses or raw IP addresses are stored in this throttle table.
CREATE TABLE IF NOT EXISTS public.signup_email_check_limits (
  requester_key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL
);
ALTER TABLE public.signup_email_check_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signup_email_check_limits FROM PUBLIC, anon, authenticated;

-- Only the server's service role can call this function; the browser cannot.
-- NULL means throttled. Boolean values reveal only the requested membership bit.
CREATE OR REPLACE FUNCTION public.check_signup_email(candidate_email text, requester_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_window timestamptz := date_trunc('minute', now());
  attempts integer;
BEGIN
  IF candidate_email IS NULL OR length(candidate_email) > 254
     OR candidate_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR requester_key IS NULL OR requester_key !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid request';
  END IF;

  DELETE FROM public.signup_email_check_limits AS limits
  WHERE limits.window_start < current_window - interval '2 minutes';

  INSERT INTO public.signup_email_check_limits AS limits
    (requester_key, window_start, request_count)
  VALUES (check_signup_email.requester_key, current_window, 1)
  ON CONFLICT ON CONSTRAINT signup_email_check_limits_pkey DO UPDATE
  SET window_start = EXCLUDED.window_start,
      request_count = CASE WHEN limits.window_start = EXCLUDED.window_start
        THEN least(limits.request_count + 1, 21) ELSE 1 END
  RETURNING request_count INTO attempts;

  IF attempts > 20 THEN RETURN NULL; END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users AS u
    WHERE lower(u.email) = lower(btrim(candidate_email))
      AND u.deleted_at IS NULL
  );
END;
$$;

ALTER FUNCTION public.check_signup_email(text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.check_signup_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_signup_email(text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
