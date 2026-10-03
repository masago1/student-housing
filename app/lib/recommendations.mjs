import { defaultFilters, readUrlFilters, filtersToSearchParams, filterListings, normalizeLocation, validateFilterValues } from "./rentalFilters.mjs";

export const SEARCH_INTENT_KEY = "shaus-recent-search";
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;

// Store only the latest applied search, never draft input, account data or coordinates.
export function rememberSearch() {
  try {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] !== "chirii" || !parts[1]) return;
    const filters = readUrlFilters(window.location.search);
    if (validateFilterValues(filters)) return;
    window.localStorage.setItem(SEARCH_INTENT_KEY, JSON.stringify({ version: 1,
      city: normalizeLocation(parts[1]), university: parts[2] ? normalizeLocation(parts[2]) : "",
      filters, savedAt: Date.now() }));
  } catch { /* Search continues when browser storage is unavailable. */ }
}

export function readSearchIntent(raw, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || typeof value.city !== "string" || !value.city ||
      !Number.isFinite(value.savedAt) || now - value.savedAt > MAX_AGE || value.savedAt > now) return null;
    const filters = readUrlFilters(filtersToSearchParams(value.filters || {}));
    if (validateFilterValues(filters)) return null;
    return { city: normalizeLocation(value.city),
      university: typeof value.university === "string" ? normalizeLocation(value.university) : "", filters };
  } catch { return null; }
}

function recentFirst(a, b) {
  return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) || String(a.id).localeCompare(String(b.id));
}

function diversify(listings) {
  const groups = new Map();
  for (const listing of listings) {
    const city = normalizeLocation(listing.city);
    if (!groups.has(city)) groups.set(city, []);
    groups.get(city).push(listing);
  }
  const result = [];
  while (result.length < listings.length) {
    for (const group of groups.values()) if (group.length) result.push(group.shift());
  }
  return result;
}

export function recommendListings(listings, { intent = null, city = "", universityIds = [], limit = 6 } = {}) {
  const active = [...new Map(listings.filter(item => item.active === true).map(item => [item.id, item])).values()].sort(recentFirst);
  const preferredCity = normalizeLocation(intent?.city || city);
  if (!preferredCity) return diversify(active).slice(0, limit);
  const sameCity = active.filter(item => normalizeLocation(item.city) === preferredCity);
  const others = active.filter(item => normalizeLocation(item.city) !== preferredCity);
  if (!intent) return [...sameCity, ...diversify(others)].slice(0, limit);
  const filters = { ...defaultFilters, ...intent.filters, sort: "newest" };
  const linked = new Set(universityIds);
  const matching = filterListings(sameCity, filters).filter(item => !intent.university || linked.has(item.id));
  const matchedIds = new Set(matching.map(item => item.id));
  // Reuse each canonical comparison to rank partial matches without a second filter implementation.
  const criteria = Object.keys(defaultFilters).filter(key => key !== "sort" && filters[key]);
  const score = item => criteria.reduce((total, key) => total + filterListings([item], { ...defaultFilters, [key]: filters[key] }).length, 0)
    + (intent.university && linked.has(item.id) ? 2 : 0);
  const remaining = sameCity.filter(item => !matchedIds.has(item.id)).sort((a, b) => score(b) - score(a) || recentFirst(a, b));
  return [...matching.sort(recentFirst), ...remaining, ...diversify(others)].slice(0, limit);
}

// Page through the public view so older matching listings are not lost to a global limit.
export async function loadRecommendationListings(client, signal) {
  const result = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    if (signal?.aborted) throw new Error("Cancelled");
    let query = client.from("public_listings").select(`id, title, city, neighborhoods(name, slug),
      price_monthly, rooms, bedrooms, bathrooms, surface_m2, property_type, listing_type,
      furnished, available_from, image_url, active, created_at`)
      .eq("active", true).order("created_at", { ascending: false }).order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    result.push(...(data || []));
    if (!data || data.length < pageSize) return result;
  }
}
