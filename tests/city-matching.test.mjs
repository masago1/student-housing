import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../app/chirii/[city]/${name}`, import.meta.url), 'utf8');
const desktop = read('CityListingsClient.js');
const mobile = read('MobileCityListingsClient.js');
const normalizer = source => new Function(`${source.match(/function normalizeCity\(value = ""\) \{[\s\S]*?\n\}/)[0]}\nreturn normalizeCity;`)();
const desktopCity = normalizer(desktop);
const mobileCity = normalizer(mobile);

test('Production Cluj-Napoca listing matches its route on desktop and mobile', () => {
  const listing = { id: '0d5a8d40-02c7-490e-ab73-cec26b02d27d', city: 'Cluj-Napoca', active: true };
  for (const normalize of [desktopCity, mobileCity]) {
    assert.equal(normalize(listing.city), normalize('cluj-napoca'));
  }
  // Exercise the actual mobile post-query city filter, not just the helper.
  const filter = mobile.match(/const filtered = \(data \|\| \[\]\)\.filter\([\s\S]*?\n        \);/)[0];
  const apply = new Function('data', 'normalizedCity', 'normalizeCity', `${filter}\nreturn filtered;`);
  assert.deepEqual(apply([listing, { city: 'București' }], mobileCity('cluj-napoca'), mobileCity), [listing]);
});

test('city names, slugs, whitespace, diacritics and encoded names produce identical datasets', () => {
  const cities = ['Cluj-Napoca', 'Cluj Napoca', ' CLUJ-NAPOCA ', 'Cluj–Napoca',
    'Cluj  Napoca', 'Cluj%20Napoca', 'Târgu Mureș', 'Timișoara', 'București', '', null];
  for (const city of cities) assert.equal(mobileCity(city), desktopCity(city));
  for (const slug of ['cluj-napoca', 'targu-mures', 'timisoara', 'bucuresti']) {
    const desktopRows = cities.filter(city => desktopCity(city) === desktopCity(slug));
    const mobileRows = cities.filter(city => mobileCity(city) === mobileCity(slug));
    assert.deepEqual(mobileRows, desktopRows);
  }
});
