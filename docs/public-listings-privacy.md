# Approximate public locations — manual deployment

No SQL in this change is executed by the application. Do not deploy the code
before Stage A. Privacy protection is incomplete until Stage B is verified.

## Original listing access inventory

| File / original line | Classification | Action |
| --- | --- | --- |
| app/proprietate/[id]/page.js:14,151 | A: metadata and public detail | public_listings |
| app/chirii/[city]/CityListingsClient.js:1147 | A: desktop search | public_listings |
| app/chirii/[city]/MobileCityListingsClient.js:194 | A: mobile search | public_listings |
| app/chirii/[city]/[university]/page.js:1133 | A: university search | public_listings |
| app/sitemap.js:18 | A: sitemap | public_listings |
| app/dashboard/page.js:126 | B: favorites embedded listing | shared_listing_summaries, aliased as listings |
| app/dashboard/page.js:521 | B: conversation embedded listing | shared_listing_summaries, aliased as listings |
| app/dashboard/page.js:92 | C: own listings, user_id filter | Keep base table |
| app/editeaza-proprietate/[id]/page.js:519 | C: own listing, id and user_id filters | Keep exact base coordinates |
| app/adaugaproprietate/page.js:1725 | D: insert, returning id | Unchanged |
| app/adaugaproprietate/page.js:1920,1971 | D: cover update / failed-create cleanup delete | Unchanged |
| app/editeaza-proprietate/[id]/page.js:2277,2774 | D: listing / cover updates | Unchanged |
| app/dashboard/page.js:1272,1351 | D: activate/deactivate, delete | Unchanged |

Homepage does not read listings. MessageOwnerButton uses the public page's
listing ID and owner ID; it reads/writes conversations/messages, not listings.
Image/university tables remain separate queries. Account-deletion setup SQL
reads listings in privileged ownership/dependency checks and deletion subqueries;
these are administrative operations, not public reads, and remain unchanged.

## Interfaces and permissions

public_listings contains active listings and the union of fields required by
existing explicit public projections. latitude/longitude are PostgreSQL numeric
values rounded to 0.005 degrees; NULL remains NULL. No exact-coordinate alias is
provided. user_id is retained because messaging initiation needs the owner ID.
neighborhood_id supports the existing PostgREST neighborhood embed. IDs, active,
created_at and listing_type support existing relations, filters and sorting.

shared_listing_summaries contains no coordinates or contact fields. It exposes
only existing dashboard summary columns, and only when auth.uid() owns a favorite
or participates in a conversation referencing that listing. Inactive listing
context is intentionally allowed here, never in the public interface. This
preserves existing conversations without preserving base-table non-owner access.

Both views are deliberately owned by postgres and use owner-context permissions
(security_invoker=false). They bypass base RLS for reading their source tables;
their explicit projections, predicates and SELECT-only grants are the security
boundary. security_barrier prevents caller predicates from being pushed ahead
of security predicates where PostgreSQL would otherwise allow it. Neither view
calls user-controlled functions. Existing account-deletion pending/stale-account
checks are reproduced explicitly because base RLS does not protect these views.

Do not grant API roles ownership, write permissions or CREATE in public. Audit
inherited permissions as well. Do not switch these views to security_invoker:
after Stage B it would require base-table public access or return owner-only rows.

Stage B retains existing write policies. A restrictive SELECT policy makes owner
identity mandatory even if broad permissive SELECT/ALL policies still exist.
An owner permissive SELECT allows own inactive rows, while existing restrictive
deletion guards remain effective. anon loses table and column SELECT grants and
also receives a restrictive false SELECT policy. authenticated retains base SELECT
but sees only own rows. Normal API roles must not bypass RLS.

## Required live review before Stage B

Repository code does not establish the live RLS policies. Inspect these first:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

SELECT p.polrelid::regclass AS dependent_table, p.polname
FROM pg_depend AS d
JOIN pg_policy AS p ON p.oid = d.objid
WHERE d.classid = 'pg_policy'::regclass
  AND d.refclassid = 'pg_class'::regclass
  AND d.refobjid = 'public.listings'::regclass
  AND p.polrelid <> 'public.listings'::regclass;

SELECT c.relname, c.reloptions, pg_get_userbyid(c.relowner) AS owner,
       pg_get_viewdef(c.oid, true) AS definition
FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm');

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f';
```

Also review other Data API exposed schemas, role memberships and any other
endpoints/views/functions that could return exact coordinates. The Stage B
preflight detects direct policy dependencies, but cannot prove that dynamic SQL
or indirect functions are safe. If images/favorites/conversation policies inspect
listings using caller permissions, tightening listings can break their reads or
writes. STOP and review those actual definitions; do not remove the preflight or
automatically rewrite unknown policies. A follow-up targeted policy adaptation
may be required before Stage B. No universal replacement is proposed blindly.

## Deployment sequence

1. Review the live dependencies above and the complete Stage A/B SQL files.
2. Manually apply public-listings-stage-a.sql. Existing code/base access continues
   to work; exact coordinates are still accessible until Stage B.
3. Confirm the two views' SELECT-only grants and PostgREST schema reload. Test
   neighborhoods from public_listings and favorites/conversations embedding
   listings:shared_listing_summaries. PostgREST infers relationships from base
   PK/FK columns preserved by these views; actual schema inference needs a live test.
4. Deploy application changes and test public detail/search, mobile filters,
   university results, favorites (including inactive), conversations (including
   inactive), messaging initiation, images, phone and sitemap.
5. Resolve any reviewed live-policy dependencies before manually applying Stage B.
   Stage B intentionally stops if direct cross-table policy dependencies remain.
6. Run public-listings-verification.sql in separate blocks with a real User A UUID
   and known listings belonging to A and B. Zero rows without baseline fixtures
   is not proof. Repeat with User B. Check owner Edit reopens exact saved location
   and can save it. No private coordinate values are printed by verification SQL.
7. Inspect anonymous and authenticated non-owner browser network/RSC props: map
   inputs must come only from the safe view. Old open tabs/cached pages may need
   refresh; already disclosed coordinates cannot be recalled.

Rollback before Stage B: redeploy prior application while keeping additive views.
After Stage B, keep the safe interface when fixing issues; rolling back base
protections would re-expose exact coordinates. Do not silently restore broad reads.

## Limits and tests

The address and public images remain unchanged and may identify the location
independently (including image metadata). A deterministic grid is a reduction in
precision, not anonymity: its center and cell are public, and the true point may
coincide with the grid center. The existing 500 m map circle is unchanged.

Source-contract tests check safe query routing, projection coverage, base owner
access retention and SQL security predicates. The production build validates
compilation. Neither proves live grants/RLS, PostgREST relation inference, browser
behavior or Supabase writes. No SQL was executed during implementation; live
checks above are mandatory before declaring the production exposure fixed.
