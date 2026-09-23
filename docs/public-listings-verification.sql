-- READ-ONLY. Run each transaction separately after Stage B.
-- Replace <USER_A_UUID> with a real, non-deleting account owning listings.
-- The database must also contain another owner's listing for a useful test.

-- 1. Privileged inspection: no private coordinate values are returned.
BEGIN READ ONLY;
SELECT
    count(*) AS public_rows,
    count(*) FILTER (WHERE p.active IS NOT TRUE) AS inactive_public_rows,
    count(*) FILTER (
        WHERE p.latitude IS DISTINCT FROM round(l.latitude::numeric / 0.005) * 0.005
           OR p.longitude IS DISTINCT FROM round(l.longitude::numeric / 0.005) * 0.005
    ) AS approximation_mismatches,
    count(*) FILTER (
        WHERE (p.latitude IS NULL) IS DISTINCT FROM (l.latitude IS NULL)
           OR (p.longitude IS NULL) IS DISTINCT FROM (l.longitude IS NULL)
    ) AS null_mismatches
FROM public.public_listings AS p
JOIN public.listings AS l ON l.id = p.id;

SELECT
    count(*) FILTER (WHERE user_id = '<USER_A_UUID>'::uuid) AS own_test_rows,
    count(*) FILTER (WHERE user_id <> '<USER_A_UUID>'::uuid) AS other_test_rows
FROM public.listings;

SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('public_listings', 'shared_listing_summaries')
ORDER BY table_name, ordinal_position;
ROLLBACK;

-- 2. Anonymous public view: active rows only, coordinates on the 0.005 grid.
BEGIN READ ONLY;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';
SET LOCAL request.jwt.claim.sub = '';
SELECT
    count(*) AS public_rows,
    count(*) FILTER (WHERE active IS NOT TRUE) AS inactive_rows,
    count(*) FILTER (
        WHERE mod(latitude, 0.005) <> 0 OR mod(longitude, 0.005) <> 0
    ) AS off_grid_rows
FROM public.public_listings;
ROLLBACK;

-- 3. Anonymous base access: expect permission denied (or zero rows if an
-- inherited grant exists and the restrictive policy blocks them).
-- If the SELECT errors, run ROLLBACK before running the next block.
BEGIN READ ONLY;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';
SET LOCAL request.jwt.claim.sub = '';
SELECT count(latitude), count(longitude) FROM public.listings;
ROLLBACK;

-- 4. Authenticated owner/non-owner isolation in one test.
-- other_rows MUST be zero; own_rows must match the privileged baseline.
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"<USER_A_UUID>"}';
SET LOCAL request.jwt.claim.sub = '<USER_A_UUID>';
SELECT
    count(*) FILTER (WHERE user_id = auth.uid()) AS own_rows,
    count(*) FILTER (WHERE user_id IS DISTINCT FROM auth.uid()) AS other_rows,
    count(latitude) FILTER (WHERE user_id IS DISTINCT FROM auth.uid()) AS other_latitudes,
    count(longitude) FILTER (WHERE user_id IS DISTINCT FROM auth.uid()) AS other_longitudes
FROM public.listings;
SELECT
    count(*) AS public_rows,
    count(*) FILTER (WHERE active IS NOT TRUE) AS inactive_rows,
    count(*) FILTER (
        WHERE mod(latitude, 0.005) <> 0 OR mod(longitude, 0.005) <> 0
    ) AS off_grid_rows
FROM public.public_listings;
SELECT count(*) AS unrelated_summary_rows
FROM public.shared_listing_summaries AS s
WHERE NOT EXISTS (
    SELECT 1 FROM public.favorites AS f
    WHERE f.listing_id = s.id AND f.user_id = auth.uid()
)
AND NOT EXISTS (
    SELECT 1 FROM public.conversations AS c
    WHERE c.listing_id = s.id
      AND (c.tenant_id = auth.uid() OR c.owner_id = auth.uid())
);
ROLLBACK;
