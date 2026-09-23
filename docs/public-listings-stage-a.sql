-- MANUAL REVIEW ONLY. Stage A: apply before deploying the application changes.
-- Requires PostgreSQL 15+ and the previously installed account-deletion setup.
BEGIN;

CREATE VIEW public.public_listings
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    l.id, l.user_id, l.title, l.description, l.city, l.neighborhood_id,
    l.address,
    round(l.latitude::numeric / 0.005) * 0.005 AS latitude,
    round(l.longitude::numeric / 0.005) * 0.005 AS longitude,
    l.price_monthly, l.property_type, l.listing_type,
    l.rooms, l.bedrooms, l.bathrooms, l.surface_m2, l.floor, l.total_floors,
    l.furnished, l.air_conditioning, l.balcony, l.parking,
    l.construction_year, l.heating_type, l.max_tenants,
    l.pets_allowed, l.smoking_allowed, l.utilities_included, l.deposit_amount,
    l.available_from, l.image_url, l.owner_name, l.owner_phone,
    l.active, l.created_at
FROM public.listings AS l
WHERE l.active IS TRUE
  AND (
      auth.uid() IS NULL
      OR (
          EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = auth.uid())
          AND NOT EXISTS (
              SELECT 1 FROM public.account_deletion_requests AS d
              WHERE d.user_id = auth.uid()
          )
      )
  );

ALTER VIEW public.public_listings OWNER TO postgres;
REVOKE ALL ON public.public_listings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_listings TO anon, authenticated;

-- Preserve safe listing context for favorites and existing conversations,
-- including inactive listings. No location coordinates or contact fields.
CREATE VIEW public.shared_listing_summaries
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    l.id, l.user_id, l.title, l.city, l.address, l.price_monthly,
    l.rooms, l.surface_m2, l.image_url, l.active, l.created_at
FROM public.listings AS l
WHERE auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = auth.uid())
  AND NOT EXISTS (
      SELECT 1 FROM public.account_deletion_requests AS d
      WHERE d.user_id = auth.uid()
  )
  AND (
      EXISTS (
          SELECT 1 FROM public.favorites AS f
          WHERE f.listing_id = l.id AND f.user_id = auth.uid()
      )
      OR EXISTS (
          SELECT 1 FROM public.conversations AS c
          WHERE c.listing_id = l.id
            AND (c.tenant_id = auth.uid() OR c.owner_id = auth.uid())
      )
  );

ALTER VIEW public.shared_listing_summaries OWNER TO postgres;
REVOKE ALL ON public.shared_listing_summaries FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.shared_listing_summaries TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
