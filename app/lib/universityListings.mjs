import { normalizeLocation, universitiesForCity, findUniversity } from "./rentalFilters.mjs";

// Preserve the university route's city-scoped lookup and explicit listing associations.
// null means city-only; an empty array means the university has no associated listings.
export async function universityListingIds(client, citySlug, universitySlug) {
  if (!universitySlug) return null;
  const universities = await client.from("universities").select("*");
  if (universities.error) throw universities.error;
  const cities = await client.from("cities").select("id, name, slug");
  if (cities.error) throw cities.error;
  const city = (cities.data || []).find(item => normalizeLocation(item.slug || item.name) === normalizeLocation(citySlug))
    || { name: citySlug, slug: citySlug };
  const university = findUniversity(universitiesForCity(universities.data || [], city), universitySlug);
  if (!university) throw new Error("Universitatea selectată nu a fost găsită.");
  const links = await client.from("listing_universities").select("listing_id").eq("university_id", university.id);
  if (links.error) throw links.error;
  return [...new Set((links.data || []).map(item => item.listing_id).filter(Boolean))];
}
