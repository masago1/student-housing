# Account deletion — deployment and operations

Nothing in this document or the application automatically applies SQL. Do not test
with production accounts. The endpoint fails before Storage deletion if its setup
RPC is missing.

## Manual setup before deployment

1. Review the FK inventory below in Supabase. The repository has no live schema.
   Check that Storage has `storage.objects.owner_id` (text), `bucket_id`, and `name`;
   listing IDs and account IDs are UUIDs; and all known application tables have RLS.
   Review existing triggers for unexpected delete effects and policies for the
   assumed owner/participant restrictions. This feature does not replace them.
2. Review and manually apply **account-deletion-setup.sql** once as the trusted
   database administrator (`postgres` in the SQL Editor). Its SECURITY DEFINER
   functions have a fixed empty search path; only the service role may execute
   the two destructive RPCs. It adds a private
   deletion marker table, two service-role-only RPCs, restrictive authenticated
   access policies and guards against new references to a pending-deletion user.
   It never grants additional row access or changes anon policies. Existing
   nickname immutability is untouched; its trigger only handles updates.
3. Add `SUPABASE_SERVICE_ROLE_KEY` in Vercel, server-side only, for each environment
   that should support deletion. Use the key for the same project as the existing
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never use a
   `NEXT_PUBLIC_` prefix for the service key, and never commit a real value.
4. Deploy code. Test on a separately authorized test account/project before launch.

Read-only FK inventory (execute manually if desired):

```sql
SELECT conrelid::regclass AS referencing_table,
       confrelid::regclass AS referenced_table,
       conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND confrelid IN (
    'auth.users'::regclass, 'public.profiles'::regclass,
    'public.listings'::regclass, 'public.listing_images'::regclass,
    'public.listing_universities'::regclass, 'public.favorites'::regclass,
    'public.conversations'::regclass, 'public.messages'::regclass
  )
ORDER BY referenced_table::text, referencing_table::text, conname;
```

Unknown user-linked tables without FKs must also be inventoried in Supabase; the
application cannot infer them. Add their cleanup to the transaction before release.

## Sequence and trust boundary

- Browser sends a Bearer session token plus a fixed confirmation value. There is
  no browser-supplied target UUID. Unexpected body properties are rejected.
- The server checks Origin when supplied and validates the token via Auth getUser,
  not merely by decoding the JWT. Service credentials exist only in the route.
- `prepare_account_deletion` checks image paths/ownership and installs a pending
  marker. Brief table locks drain existing writes. App requests from that account
  can no longer use the protected tables/Storage. New inserts/updates referencing
  this user, their listings or conversations are rejected, including by peers.
- Recursively list every object under `<authenticated UUID>/` in `listing-images`,
  with pagination, including orphaned files with no listing row. Collect paths
  before removing them in batches of 100, and verify the prefix is empty.
- `purge_account_data` runs one transaction: messages (both sides of affected
  threads, plus any messages sent by the user), conversations (participant or owned
  listing), favorites (own and those on owned listings), listing_images,
  listing_universities, listings, then profiles. public_profiles is a view and
  needs no separate deletion. Cities/neighborhoods/universities remain untouched.
- Hard-delete the Auth user through `auth.admin.deleteUser(id, false)`. The new
  marker's explicitly defined FK cascades at this point. Other Auth-managed records
  and session cleanup are delegated to Supabase Auth, not assumed application FKs.
- Only then return success. Browser attempts SDK local sign-out and navigates to `/`.
  The existing dashboard getUser check rejects the deleted account on a new visit.

All known application dependents are explicitly deleted. No pre-existing app
cascade is required. The only new assumed cascade is defined by this setup:
account_deletion_requests.user_id -> auth.users.id ON DELETE CASCADE.

## Failure and retry behavior

Storage, Postgres and Auth do not share a transaction. Deleted photos cannot be
rolled back. A later failure may leave photos removed, or relational data removed
but Auth still present. The UI reports incomplete deletion and never redirects on
an API failure. The marker remains, blocks further data writes, and allows the
authenticated deletion endpoint to be retried. The same cleanup steps tolerate
missing files/rows. Do not manually remove a pending marker just to restore access
after partial deletion; investigate and finish cleanup instead.

The route has a 60-second maximum duration. If a large account or provider outage
interrupts it, retry after the previous invocation ends. Concurrent invocations
may produce an error for one caller even if the other completed; a lost success
response can likewise be ambiguous. Confirm Auth/data state through an operator
before describing an ambiguous request as failed or restoring anything. A queue
with resumable status is a future improvement for high volumes.

Supabase JWT signatures remain valid until expiry even after Auth deletion. The
proposed restrictive policies check live account existence, denying stale tokens
access to the seven protected application tables and listing-images operations.
Existing public pages/bucket downloads remain public. Already downloaded messages,
photos, active browser memory, previously issued URLs and third-party copies cannot
be recalled. Check any separately configured RPCs, views, buckets and integrations
for equivalent protections; these are not discoverable from this repository.

Legacy images outside the owner prefix, conflicting ownership, or objects owned
in other buckets cause preflight failure and require manual review; they are never
blindly deleted. Storage is removed through its API, never by deleting metadata
rows directly. Unknown restrictive FKs cause the relational transaction to roll
back. Unknown cascades/triggers must be reviewed to avoid unexpected side effects.

## Validation

```text
node --test --test-isolation=none tests/delete-account.test.mjs
node tests/delete-account-sql.mjs
```

The first test uses mocks only. The SQL test needs @electric-sql/pglite installed
in a test environment (or PGLITE_MODULE pointing to its ESM entrypoint). It creates
an isolated in-memory PostgreSQL database, never connects to Supabase, and verifies
permissions, explicit cleanup with restrictive FKs, rollback and stale-token guards.
The project has no standalone lint script; also run its production build.

## Residual data

Provider backups, point-in-time recovery, hosting/Auth/SMTP logs, CDN/browser caches,
emails already delivered and third-party copies are outside immediate application
erasure. Apply documented provider retention and cache-purge procedures separately;
no retention period is invented or configured here.
