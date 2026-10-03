import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as shared from '../app/lib/rentalFilters.mjs';
import { filterFields } from '../app/lib/rentalFilterFields.mjs';

const read = name => readFileSync(new URL(`../app/chirii/[city]/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const desktop = read('CityListingsClient.js');
const mobile = read('MobileCityListingsClient.js');
// Execute the real component helpers and desktop useMemo body, so changes to either
// implementation are checked against the other without maintaining a test-only oracle.
const helper = (source, name) => source.match(new RegExp(`function ${name}\\([^]*?^}`, 'm'))[0];
const dateHelpers = ['romanianDateToISO', 'isoDateToRomanian'].map(name => helper(desktop, name)).join('\n');
const api = shared;
const { isoDateToRomanian } = shared;
const filterDesktop = new Function('listings', 'appliedFilters', 'filterDesktopListings',
  `return ${desktop.match(/useMemo\(\(\) => (filterDesktopListings\(listings, appliedFilters\))/)[1]};`);
const desktopFilters = shared.desktopUrlFilters;
const asDesktop = filters => ({ ...filters, availableFrom: isoDateToRomanian(filters.availableFrom) });
const ids = rows => rows.map(row => row.id);
const listings = Array.from({ length: 96 }, (_, i) => ({
  id: i, price_monthly: [250, 500, 750, '1000', null, '', undefined, 'invalid'][i % 8],
  surface_m2: [20, 50, 100, '150', null, '', undefined, 'invalid'][Math.floor(i / 3) % 8],
  rooms: i % 7, bedrooms: i % 6, bathrooms: i % 5,
  property_type: ['apartment', 'studio', 'house', 'room'][i % 4],
  listing_type: ['entire', 'room', null][i % 3], furnished: [true, false, null][i % 3],
  available_from: ['2026-01-01', '2026-06-01', '2026-06-02', null, '2026-06-01T12:00:00'][i % 5],
  created_at: ['2026-01-01', '2026-02-01', 'invalid', null][i % 4],
  neighborhoods: i % 3 ? { slug: ['centru', 'zorilor'][i % 2] } : null,
}));
const variants = {
  minPrice: ['', '0', '500', '1000'], maxPrice: ['', '500', '1000'],
  minSurface: ['', '50', '100'], maxSurface: ['', '50', '100'],
  rooms: ['', '0', '1', '2', '3', '4', '5', '4+'],
  bedrooms: ['', '0', '1', '2', '3', '4', '4+'], bathrooms: ['', '1', '2', '3', '3+'],
  propertyType: ['', 'apartment', 'studio', 'house', 'room'],
  listingType: ['', 'entire', 'room', 'rent'], furnished: ['', 'yes', 'no', 'invalid'],
  availableFrom: ['', '2026-06-01', '2026-02-30', 'invalid'], zone: ['', 'centru', 'zorilor', 'unknown'],
};
const sorts = ['newest', 'price_asc', 'price_desc', 'surface_desc', 'unknown'];

test('every desktop URL filter is parsed on mobile, including rent alias and ISO date', () => {
  for (const [key, values] of Object.entries(variants)) {
    for (const value of values) {
      const search = new URLSearchParams({ [key === 'zone' ? 'zona' : key]: value }).toString();
      assert.deepEqual(asDesktop(api.readUrlFilters(search)), desktopFilters(search), search);
    }
  }
  assert.deepEqual(asDesktop(api.readUrlFilters('')), desktopFilters(''));
});

function compare(search) {
  const mobileFilters = api.readUrlFilters(search);
  const expected = desktopFilters(search);
  assert.deepEqual(asDesktop(mobileFilters), expected, `URL ${search}`);
  assert.deepEqual(ids(api.filterListings(listings, mobileFilters)), ids(filterDesktop(listings, expected, shared.filterDesktopListings)), search);
}

test('each filter and all sort orders produce identical ordered listing sets', () => {
  for (const [key, values] of Object.entries(variants)) {
    for (const value of values) for (const sort of sorts) {
      compare(new URLSearchParams({ [key === 'zone' ? 'zona' : key]: value, sort }).toString());
    }
  }
});

test('combined filters produce identical ordered listing sets and survive URL round trips', () => {
  for (const listingType of ['', 'entire', 'room', 'rent']) {
    for (const zone of ['', 'centru', 'zorilor', 'unknown']) {
      for (const rooms of ['', '2', '4', '5']) for (const sort of sorts) {
        const search = new URLSearchParams({ listingType, zona: zone, rooms, sort,
          minPrice: '250', maxPrice: '1000', minSurface: '20', maxSurface: '150',
          availableFrom: '2026-06-01', furnished: 'yes', propertyType: 'apartment' }).toString();
        compare(search);
        const filters = api.readUrlFilters(search);
        assert.deepEqual(api.readUrlFilters(api.filtersToSearchParams(filters).toString()), filters);
      }
    }
  }
});

test('numeric count choices match desktop exact equality, including highest choices', () => {
  const rows = [3, 4, 5, 6].map(count => ({ id: count, rooms: count, bedrooms: count, bathrooms: count }));
  for (const [key, value] of [['rooms', '5'], ['bedrooms', '4'], ['bathrooms', '3']]) {
    assert.deepEqual(ids(api.filterListings(rows, { ...api.defaultFilters, [key]: value })), [Number(value)]);
  }
  const fields = filterFields;
  for (const [name, expected] of [['rooms', ['', '1', '2', '3', '4', '5']], ['bedrooms', ['', '1', '2', '3', '4']], ['bathrooms', ['', '1', '2', '3']]]) {
    assert.deepEqual(Object.values(fields).flat().find(field => field.name === name).options.map(([value]) => value), expected);
  }
});

test('mobile input validation accepts and rejects the same ranges and dates as desktop', () => {
  const validation = desktop.match(/  function validateFilters\(\) \{([^]*?)\n  }/)[1];
  const keys = ['minPrice', 'maxPrice', 'minSurface', 'maxSurface', 'availableFrom'];
  const validateDesktop = new Function(...keys,
    `${['isValidInteger', 'numberValue', 'isValidRomanianDate'].map(name => helper(desktop, name)).join('\n')}\n${validation}`);
  const cases = [{ minPrice: '900', maxPrice: '500' }, { minSurface: '100', maxSurface: '50' }];
  for (const key of keys.slice(0, 4)) for (const value of ['', '0', '-1', '1', '1.5', '01', '1e2', '10000', '10001', '100000', '100001', 'NaN']) cases.push({ [key]: value });
  for (const availableFrom of ['', '2026-06-01', '2026-02-30', '2024-02-29', '2026-02-29']) cases.push({ availableFrom });
  for (const item of cases) {
    const filters = { ...api.defaultFilters, ...item };
    const values = asDesktop(filters);
    assert.equal(Boolean(api.validateFilterValues(filters)), validateDesktop(...keys.map(key => values[key])).length > 0, JSON.stringify(item));
  }
});

test('apply/reset serialize all filters and neighborhood loading never replaces the selected zone', () => {
  const update = mobile.match(/  function updateFiltersUrl\(filters\) \{[^]*?\n  }/)[0];
  let url;
  const write = new Function('window', 'citySlug', 'filtersToSearchParams', `${update}; return updateFiltersUrl;`)(
    { history: { pushState: (_state, _title, value) => { url = value; } } }, 'timisoara', api.filtersToSearchParams);
  const filters = api.readUrlFilters('rooms=2&listingType=room&zona=centru&sort=price_asc&availableFrom=2026-06-01');
  write(filters);
  assert.deepEqual(api.readUrlFilters(new URL(url, 'https://shaus.ro').search), filters);
  write(null);
  assert.equal(url, '/chirii/timisoara');
  assert.match(mobile, /updateFiltersUrl\(draftFilters\)/);
  assert.match(mobile, /updateFiltersUrl\(null\)/);
  const neighborhoodsEffect = mobile.slice(mobile.indexOf('    let cancelled = false;'), mobile.indexOf('  }, [citySlug]);', mobile.indexOf('    let cancelled = false;')));
  assert.doesNotMatch(neighborhoodsEffect, /set(?:Draft|Applied)Filters/);
});

test('both listing queries include listing_type and use the same active dataset without pagination', () => {
  for (const source of [desktop, mobile]) {
    const query = source.slice(source.indexOf('.from("public_listings")'), source.indexOf('if (', source.indexOf('.from("public_listings")')));
    assert.match(query, /\blisting_type\b/);
    assert.match(query, /\.eq\("active", true\)/);
    assert.doesNotMatch(query, /\.(?:limit|range)\(/);
  }
});
