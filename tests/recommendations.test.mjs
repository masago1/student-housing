import test from "node:test";
import assert from "node:assert/strict";
import { defaultFilters, filterListings } from "../app/lib/rentalFilters.mjs";
import { SEARCH_INTENT_KEY, rememberSearch, readSearchIntent, recommendListings, loadRecommendationListings } from "../app/lib/recommendations.mjs";
import { recommendationCity } from "../app/lib/recommendationLocation.mjs";

const base = { active: true, city: "Timișoara", created_at: "2026-10-01", neighborhoods: { slug: "centru" },
  rooms: 2, bedrooms: 1, bathrooms: 1, price_monthly: 450, surface_m2: 55, property_type: "apartment",
  furnished: true, listing_type: "entire", available_from: "2026-10-01" };
const listing = (id, fields = {}) => ({ ...base, id, ...fields });
const ids = rows => rows.map(row => row.id);

test("exact search and university matches precede partial matches, same city, then other cities", () => {
  const intent = { city: "TIMIȘOARA", university: "umft", filters: { ...defaultFilters, rooms: "2", maxPrice: "500" } };
  const rows = [listing("foreign-city", { city: "Cluj-Napoca", created_at: "2026-10-03" }),
    listing("same-city", { rooms: 3, price_monthly: 600 }), listing("partial", { price_monthly: 600 }),
    listing("exact"), listing("inactive", { active: false }), listing("unlinked")];
  assert.deepEqual(ids(recommendListings(rows, { intent, universityIds: ["exact"] })),
    ["exact", "unlinked", "partial", "same-city", "foreign-city"]);
});

test("every canonical preference uses the same matching rules as results pages", () => {
  const values = { zone: "centru", minPrice: "400", maxPrice: "500", rooms: "2", bedrooms: "1", bathrooms: "1",
    minSurface: "50", maxSurface: "60", propertyType: "apartment", furnished: "yes", listingType: "entire", availableFrom: "2026-10-02" };
  const differences = { zone: { neighborhoods: { slug: "other" } }, minPrice: { price_monthly: 300 }, maxPrice: { price_monthly: 600 },
    rooms: { rooms: 3 }, bedrooms: { bedrooms: 2 }, bathrooms: { bathrooms: 2 }, minSurface: { surface_m2: 40 }, maxSurface: { surface_m2: 70 },
    propertyType: { property_type: "house" }, furnished: { furnished: false }, listingType: { listing_type: "room" }, availableFrom: { available_from: "2026-11-01" } };
  for (const [key, value] of Object.entries(values)) {
    const filters = { ...defaultFilters, [key]: value };
    const rows = [listing("newer-mismatch", { ...differences[key], created_at: "2026-10-03" }), listing("older-match")];
    assert.deepEqual(ids(filterListings(rows, filters)), ["older-match"], key);
    assert.equal(recommendListings(rows, { intent: { city: "timisoara", filters } })[0].id, "older-match", key);
  }
});

test("nationwide fallback is deterministic, recent within city, diverse and deduplicated", () => {
  const rows = [listing("t1", { created_at: "2026-10-03" }), listing("t2"), listing("t3"),
    listing("c1", { city: "Cluj Napoca" }), listing("b1", { city: "București" }), listing("c2", { city: "CLUJ-NAPOCA" })];
  const result = ids(recommendListings([...rows, rows[0], listing("hidden", { active: false })]));
  assert.deepEqual(result, ["t1", "b1", "c1", "t2", "c2", "t3"]);
  assert.deepEqual(ids(recommendListings([...rows].reverse())), result);
  assert.deepEqual(recommendListings([]), []);
});

test("location fallback prefers the city and never overrides search intent", () => {
  const rows = [listing("t"), listing("c", { city: "Cluj Napoca" }), listing("b", { city: "București" })];
  assert.equal(recommendListings(rows, { city: "CLUJ-NAPOCA" })[0].id, "c");
  assert.equal(recommendListings(rows, { city: "Cluj Napoca", intent: { city: "timisoara", filters: defaultFilters } })[0].id, "t");
});

test("applied URL search is stored canonically; reset replaces stale filters; blocked storage is harmless", () => {
  const stored = new Map();
  globalThis.window = { location: { pathname: "/chirii/Timișoara/umft", search: "?maxPrice=500&zona=centru&listingType=rent&availableFrom=2026-11-01" },
    localStorage: { setItem: (key, value) => stored.set(key, value) } };
  rememberSearch();
  const intent = readSearchIntent(stored.get(SEARCH_INTENT_KEY));
  assert.equal(intent.city, "timisoara"); assert.equal(intent.university, "umft");
  assert.equal(intent.filters.zone, "centru"); assert.equal(intent.filters.listingType, "entire");
  assert.equal(intent.filters.availableFrom, "2026-11-01");
  window.location.search = ""; rememberSearch();
  assert.deepEqual(readSearchIntent(stored.get(SEARCH_INTENT_KEY)).filters, defaultFilters);
  window.localStorage.setItem = () => { throw new Error("Blocked"); };
  assert.doesNotThrow(rememberSearch);
  delete globalThis.window;
});

test("invalid, expired, future and malformed saved searches are ignored", () => {
  const now = Date.now();
  for (const raw of [null, "broken", "{}", JSON.stringify({ version: 1, city: "bad%", savedAt: now }),
    JSON.stringify({ version: 1, city: "timisoara", savedAt: now - 31 * 86400000 }),
    JSON.stringify({ version: 1, city: "timisoara", savedAt: now + 1000 }),
    JSON.stringify({ version: 1, city: "timisoara", savedAt: now, filters: { minPrice: "-1" } })]) {
    assert.equal(readSearchIntent(raw, now), null);
  }
});

test("query pages through active public listings instead of dropping older matches", async () => {
  const ranges = [];
  const client = { from(table) {
    assert.equal(table, "public_listings");
    const query = { select(fields) { assert.ok(!fields.includes("owner_phone")); return query; },
      eq(key, value) { assert.equal(key, "active"); assert.equal(value, true); return query; },
      order() { return query; }, range(start, end) { ranges.push([start, end]); return Promise.resolve({ data: start ? [listing("old")] : Array.from({ length: 500 }, (_, i) => listing(String(i))) }); } };
    return query;
  } };
  assert.equal((await loadRecommendationListings(client)).length, 501);
  assert.deepEqual(ranges, [[0, 499], [500, 999]]);
});

test("location requires consent, uses browser permission, and resolves only supported Romanian cities", async () => {
  let geoCalls = 0, fetchCalls = 0;
  const cities = [{ name: "Timișoara", slug: "timisoara" }];
  const geolocation = { getCurrentPosition(resolve, reject, options) {
    geoCalls++; assert.equal(options.enableHighAccuracy, false); resolve({ coords: { longitude: 21.2, latitude: 45.7 } });
  } };
  const fetcher = async url => { fetchCalls++; assert.ok(url.includes("types=place"));
    return { ok: true, json: async () => ({ features: [{ properties: { name: "Timisoara", context: { country: { country_code: "RO" } } } }] }) }; };
  const options = { token: "test", cities, geolocation, fetcher };
  assert.equal(await recommendationCity({ ...options, allowed: false }), null);
  assert.equal(geoCalls, 0); assert.equal(fetchCalls, 0);
  assert.deepEqual(await recommendationCity({ ...options, allowed: true }), cities[0]);
  const controller = new AbortController(); controller.abort();
  assert.equal(await recommendationCity({ ...options, allowed: true, signal: controller.signal }), null);
  assert.equal(geoCalls, 1);
  const denied = { getCurrentPosition(resolve, reject) { reject(new Error("Permission denied")); } };
  await assert.rejects(recommendationCity({ ...options, allowed: true, geolocation: denied }));
  assert.equal(fetchCalls, 1);
  assert.equal(await recommendationCity({ ...options, allowed: true, fetcher: async () => ({ ok: true,
    json: async () => ({ features: [{ properties: { name: "Timisoara", context: { country: { country_code: "rs" } } } }] }) }) }), null);
});

test("revoking consent during geolocation prevents the external request", async () => {
  const controller = new AbortController();
  const result = await recommendationCity({ allowed: true, token: "test", signal: controller.signal, cities: [],
    geolocation: { getCurrentPosition(resolve) { controller.abort(); resolve({ coords: { longitude: 1, latitude: 1 } }); } },
    fetcher: () => { assert.fail("No external request after withdrawal"); } });
  assert.equal(result, null);
});
