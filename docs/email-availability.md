# Signup email availability

## Deployment

1. Run `docs/email-availability-setup.sql` in the Supabase SQL Editor as the
   database administrator. The code does not execute this setup automatically.
2. Configure `SUPABASE_SERVICE_ROLE_KEY` on the application server, for the same
   project as `NEXT_PUBLIC_SUPABASE_URL`. This is the existing account-deletion
   server credential; never give it a `NEXT_PUBLIC_` prefix or include it in client code.
3. Deploy and verify `/api/auth/email-availability` from the signup page. Missing
   SQL, missing credentials, throttling or provider errors do not report an email
   as available. A submission-time check failure shows a retry message and stops
   signup. Apply the SQL and key before deploying the frontend.

No live Supabase connection or installed Next.js dependencies were available in
the implementation workspace. SQL execution, actual grants and browser/build
integration still require verification in the deployed environment.

## Behavior and scope

Signup checks syntactically complete email addresses after a 300 ms pause,
discards stale results and aborts requests on edits or leaving signup. Email
addresses are trimmed and compared case-insensitively. Plus tags and dots are
not removed. Taken addresses display the requested red message below the email
field. Editing clears that message; a response for an old address cannot restore
it. Known duplicates block the button and submit handler, and a fresh check runs
before Auth signup. The existing case-sensitive username check is unchanged.

The SQL reads active Auth users, including unconfirmed registrations, and does
not mirror email addresses into public profiles or grant clients access to Auth.
It does not alter Auth's email uniqueness, confirmation, password or login settings.

Signup also handles Auth's `email_exists` and `user_already_exists` error codes,
the legacy duplicate message, and the obscured duplicate response with no session
and an empty identities array. New users needing confirmation still receive the
existing confirmation message. Supabase remains authoritative for registration;
the availability check is not a reservation. In particular, concurrent signup of
an unconfirmed email may follow Auth's existing resend/update behavior; this
feature does not change that authentication lifecycle.

## Security boundary

An explicit email-existence message necessarily permits account enumeration.
The server route reduces access and abuse; it cannot make that existence signal
private while displaying it to unauthenticated visitors. Supabase's own obscured
signup response is intended to hide account existence. No Auth setting is disabled.

Only the service role can execute the SECURITY DEFINER function; its search path
is fixed and table references are qualified. It returns a single boolean, or NULL
when throttled. Browser responses never include user IDs, records, credentials,
confirmation state or raw database errors. POST bodies are bounded, origins are
checked, and responses are not cached. Same-origin checks are not authentication
and do not stop scripted callers.

The database atomically limits each requester to 20 checks per fixed minute across
server instances. Both existing and available email checks count. On Vercel, the
route uses the platform's `x-vercel-forwarded-for` header; the IP is HMAC-hashed
with the server key before storage. Other hosts share one bucket rather than
trusting spoofable forwarded headers. Configure a trusted proxy integration before
using per-client limits on another host. Shared IPs share quota, minute boundaries
allow bursts, and distributed callers can still enumerate addresses. Stale bucket
rows are deleted by subsequent requests after two minutes; no emails are stored.

## Verification

Use a test Supabase project to check:

- A registered email and case variants show the inline error, including unconfirmed accounts.
- An available email clears it; rapid edits, paste and autofill do not show stale results.
- With a duplicate response after a successful preflight, signup shows the email error
  and does not write a profile or claim successful registration.
- Missing RPC/key, network errors and the 21st check in a minute produce no availability
  result; submission does not continue after an unsuccessful preflight.
- Direct RPC calls with anon and authenticated keys fail; service-role calls work.
- Simultaneous requests share the same database rate bucket; client headers cannot
  override the Vercel-supplied source address.
- Login, password recovery, new-account confirmation and exact-case username matching
  retain their existing behavior.

References: [Supabase signup](https://supabase.com/docs/reference/javascript/auth-signup),
[Auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes),
[Vercel request headers](https://vercel.com/docs/headers/request-headers).
