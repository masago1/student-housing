import { normalizeLocation } from "./rentalFilters.mjs";

// Called only from an explicit user action with external-services consent.
export async function recommendationCity({ allowed, token, cities, signal, geolocation, fetcher = fetch }) {
  if (!allowed || !token || !geolocation || signal?.aborted) return null;
  const position = await new Promise((resolve, reject) => geolocation.getCurrentPosition(resolve, reject,
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }));
  if (signal?.aborted) return null;
  const params = new URLSearchParams({ longitude: String(position.coords.longitude), latitude: String(position.coords.latitude),
    types: "place", language: "ro", access_token: token });
  const response = await fetcher(`https://api.mapbox.com/search/geocode/v6/reverse?${params}`, { signal });
  if (!response.ok) throw new Error("Location unavailable");
  const data = await response.json();
  if (signal?.aborted) return null;
  const place = data.features?.find(feature => feature.properties?.context?.country?.country_code?.toLowerCase() === "ro");
  const name = place?.properties?.name;
  return name ? cities.find(city => [city.name, city.slug].some(value => normalizeLocation(value) === normalizeLocation(name))) || null : null;
}
