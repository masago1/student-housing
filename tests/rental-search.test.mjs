import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultFilters, readUrlFilters, desktopUrlFilters, filterListings, filterDesktopListings,
  normalizeLocation, universitiesForCity, findUniversity, searchUrl, filtersToSearchParams } from '../app/lib/rentalFilters.mjs';

const city = { id: 'c1', name: 'Târgu Mureș', slug: 'targu-mures' };
const universities = [
  { id: 'u1', name: 'University One', short_name: 'UMF', city: 'TARGU-MURES' },
  { id: 'u2', name: 'University Two', city_id: 'c1' },
  { id: 'u3', name: 'Wrong City', city_id: 'c2', city: 'Târgu Mureș' },
  { id: 'u4', name: 'Another City', city: 'Cluj-Napoca' },
];
const base = { price_monthly: 500, rooms: 5, bedrooms: 4, bathrooms: 3, surface_m2: 100,
  property_type: 'apartment', listing_type: 'entire', furnished: true, available_from: '2026-06-01',
  created_at: '2026-01-01', neighborhoods: { slug: 'centru' } };
const rows = [
  { ...base, id: 'match' }, { ...base, id: 'larger-counts', rooms: 6, bedrooms: 5, bathrooms: 4 },
  { ...base, id: 'room', listing_type: 'room' }, { ...base, id: 'other-zone', neighborhoods: { slug: 'vest' } },
  { ...base, id: 'later', available_from: '2026-06-02' }, { ...base, id: 'cheap', price_monthly: 250 },
  { ...base, id: 'unfurnished', furnished: false }, { ...base, id: 'small', surface_m2: 50 },
];
const filters = { ...defaultFilters, minPrice: '500', maxPrice: '500', rooms: '5', bedrooms: '4', bathrooms: '3',
  minSurface: '100', maxSurface: '100', propertyType: 'apartment', listingType: 'entire', furnished: 'yes',
  availableFrom: '2026-06-01', zone: 'centru', sort: 'price_asc' };

test('city-scoped university matching handles diacritics and respects explicit city IDs', () => {
  assert.deepEqual(universitiesForCity(universities, city).map(item => item.id), ['u1', 'u2']);
  assert.deepEqual(universitiesForCity(universities, null), []);
  assert.equal(findUniversity(universitiesForCity(universities, city), 'u1'), universities[0]);
  assert.equal(findUniversity(universitiesForCity(universities, city), 'UMF'), universities[0]);
  assert.equal(findUniversity(universitiesForCity(universities, city), 'u4'), null);
  assert.equal(normalizeLocation('TÂRGU MUREȘ'), city.slug);
});

test('home search URLs round-trip every canonical filter for city and university routes', () => {
  for (const university of [null, universities[0]]) {
    const url = new URL(searchUrl(city.slug, university, filters), 'https://shaus.ro');
    assert.equal(url.pathname, university ? '/chirii/targu-mures/umf' : '/chirii/targu-mures');
    assert(!url.searchParams.has('universitate'));
    assert(!url.searchParams.has('zone'));
    assert.equal(url.searchParams.get('zona'), 'centru');
    assert.deepEqual(readUrlFilters(url.search), filters);
    assert.deepEqual(filterListings(rows, readUrlFilters(url.search)).map(row => row.id), ['match']);
    assert.deepEqual(filterDesktopListings(rows, desktopUrlFilters(url.search)).map(row => row.id), ['match']);
  }
});

test('legacy rent maps to entire, dates and all sort orders retain city semantics', () => {
  const params = filtersToSearchParams(filters); params.set('listingType', 'rent');
  assert.deepEqual(filterListings(rows, readUrlFilters(params)).map(row => row.id), ['match']);
  const pairs = [{ ...base, id: 'a', price_monthly: 700, surface_m2: 50, created_at: '2026-01-01' },
    { ...base, id: 'b', price_monthly: 300, surface_m2: 100, created_at: '2026-02-01' }];
  for (const [sort, expected] of [['price_asc', ['b','a']], ['price_desc', ['a','b']], ['surface_desc', ['b','a']], ['newest', ['b','a']], ['unknown', ['b','a']]]) {
    assert.deepEqual(filterListings(pairs, { ...defaultFilters, sort }).map(row => row.id), expected);
  }
  assert.equal(searchUrl(city.slug, null, defaultFilters), '/chirii/targu-mures');
  assert.equal(searchUrl(city.slug, universities[0], defaultFilters), '/chirii/targu-mures/umf');
});

test('all result views use the shared predicate and university query includes neighborhood data', () => {
  for (const file of ['CityListingsClient.js']) {
    const source = readFileSync(new URL(`../app/chirii/[city]/${file}`, import.meta.url), 'utf8');
    assert(source.includes('filterDesktopListings(listings, appliedFilters)'));
    assert(source.includes('desktopUrlFilters(window.location.search)'));
    assert(source.includes('filtersToSearchParams({'));
    assert.match(source, /neighborhoods\s*\(/);
  }
  const source = readFileSync(new URL('../app/chirii/[city]/MobileCityListingsClient.js', import.meta.url), 'utf8');
  assert(source.includes('filterListings(listings, appliedFilters)'));
  assert(source.includes('readUrlFilters(window.location.search)'));
});


test('university route renders the canonical device router without a separate UI', () => {
  const source = readFileSync(new URL('../app/chirii/[city]/[university]/page.js', import.meta.url), 'utf8');
  assert(source.includes('import DeviceRouter from "../DeviceRouter"'));
  assert(source.includes('<DeviceRouter />'));
  assert(!source.includes('Student'));
  assert(!source.includes('<header'));
});
