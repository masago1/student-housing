// DOM integration tests; use the existing temporary esbuild/jsdom installation.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const temporary = createRequire(join(process.argv[2], 'package.json'));
const { build } = temporary('esbuild');
const { JSDOM } = temporary('jsdom');
const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { url: 'https://shaus.example/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.sessionStorage = window.sessionStorage;
globalThis.localStorage = window.localStorage;
globalThis.requestAnimationFrame = callback => callback();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const calls = [];
globalThis.searchTestRouter = { push: url => calls.push(url), replace: url => calls.push(url) };
globalThis.searchTestParams = { city: 'cluj-napoca', university: 'u-test' };
const cities = [{ id: 'c1', name: 'Cluj-Napoca', slug: 'cluj-napoca' }, { id: 'c2', name: 'București', slug: 'bucuresti' }];
const universities = [{ id: 'u1', name: 'Test University', short_name: 'U Test', city: 'CLUJ NAPOCA' }, { id: 'u2', name: 'Other University', short_name: 'Other', city: 'București' }];
const neighborhoods = [{ id: 'n1', city_id: 'c1', name: 'Centru', slug: 'centru' }, { id: 'n2', city_id: 'c2', name: 'Other zone', slug: 'other' }];
const base = { city: 'Cluj Napoca', active: true, rooms: 5, bedrooms: 4, bathrooms: 3, price_monthly: 500,
  surface_m2: 100, listing_type: 'entire', property_type: 'apartment', furnished: true,
  available_from: '2026-06-01', created_at: '2026-01-01', neighborhoods: { name: 'Centru', slug: 'centru' } };
const tables = { cities, universities, neighborhoods,
  public_listings: [{ ...base, id: 'a', title: 'Listing Alpha' }, { ...base, id: 'b', title: 'Listing Beta', rooms: 6 },
    { ...base, id: 'c', title: 'Listing Gamma', neighborhoods: { slug: 'other' } },
    { ...base, id: 'd', title: 'Wrong City Listing', city: 'București' },
    { ...base, id: 'e', title: 'Inactive Listing', active: false }],
  listing_universities: ['a','b','c','d','e'].map(listing_id => ({ listing_id, university_id: 'u1' })), listing_images: [] };
globalThis.searchTestDatabase = { from(table) {
  let rows = [...(tables[table] || [])]; let single = false;
  const query = { select() { return query; }, order() { return query; },
    eq(key, value) { rows = rows.filter(row => row[key] === value); return query; },
    in(key, values) { rows = rows.filter(row => values.includes(row[key])); return query; },
    maybeSingle() { single = true; return query; },
    then(resolve, reject) { return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(resolve, reject); } };
  return query;
} };
async function component(path, name) {
  const output = join(process.argv[2], `rental-${name}.cjs`);
  await build({ entryPoints: [fileURLToPath(new URL(path, import.meta.url))], outfile: output, bundle: true,
    platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.js': 'jsx' },
    plugins: [{ name: 'fixtures', setup(builder) {
      builder.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, args => ({ path: require.resolve(args.path), external: true }));
      builder.onResolve({ filter: /next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'fixture' }));
      builder.onResolve({ filter: /lib\/supabase$/ }, () => ({ path: 'supabase', namespace: 'fixture' }));
      builder.onResolve({ filter: /(?:AccountButton|FavoriteButton|ListingImageGallery)$/ }, () => ({ path: 'empty', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'navigation'
        ? 'export const useRouter = () => globalThis.searchTestRouter; export const useParams = () => globalThis.searchTestParams;'
        : args.path === 'supabase' ? 'export const supabase = globalThis.searchTestDatabase;'
        : 'export default function Empty() { return null; }' }));
    } }],
  });
  return require(output).default;
}
const MobileHome = await component('../app/MobileHomeClient.js', 'mobile-home');
const DesktopHome = await component('../app/components/SearchBox.js', 'desktop-home');
const DesktopCity = await component('../app/chirii/[city]/CityListingsClient.js', 'desktop-city');
const MobileCity = await component('../app/chirii/[city]/MobileCityListingsClient.js', 'mobile-city');
const University = await component('../app/chirii/[city]/[university]/page.js', 'university');
const root = createRoot(document.getElementById('root'));
let renderKey = 0;
async function render(Component, props = {}) {
  await act(async () => { root.render(React.createElement(Component, { key: ++renderKey, ...props })); await new Promise(resolve => setTimeout(resolve, 0)); });
}
async function click(element) { assert(element); await act(async () => element.click()); }
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent.trim().includes(text));
async function select(element, value) {
  assert(element);
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}
async function input(element, value) {
  assert(element);
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}
const numericFilters = { minPrice: '500', maxPrice: '500', minSurface: '100', maxSurface: '100' };
const selectFilters = { bedrooms: '4', bathrooms: '3', propertyType: 'apartment', furnished: 'yes', sort: 'price_desc' };
const today = new Date();
const dateFilter = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const props = { cities, universities, neighborhoods };
await render(MobileHome, props);
await select(document.querySelectorAll('select')[0], 'cluj-napoca');
assert(!document.querySelectorAll('select')[1].textContent.includes('Other University'));
await select(document.querySelectorAll('select')[1], 'u1');
await click(button('Mai multe filtre'));
assert.equal(document.querySelectorAll('[id^="home-mobile-"]').length, 13);
await select(document.getElementById('home-mobile-listingType'), 'entire');
await select(document.getElementById('home-mobile-rooms'), '5');
await select(document.getElementById('home-mobile-zone'), 'centru');
for (const [name, value] of Object.entries(numericFilters)) await input(document.getElementById(`home-mobile-${name}`), value);
for (const [name, value] of Object.entries(selectFilters)) await select(document.getElementById(`home-mobile-${name}`), value);
await input(document.getElementById('home-mobile-availableFrom'), dateFilter);
await click(button('Vezi chiriile'));
const mobileUrl = calls.at(-1);
assert(mobileUrl.startsWith('/chirii/cluj-napoca/u-test?'));
assert(mobileUrl.includes('listingType=entire') && mobileUrl.includes('zona=centru'));
await click(button('Resetează filtrele'));
await click(button('Vezi chiriile'));
assert.equal(calls.at(-1), '/chirii/cluj-napoca/u-test');
await select(document.querySelectorAll('select')[0], 'bucuresti');
assert.equal(document.querySelectorAll('select')[1].value, '');
assert(!document.querySelectorAll('select')[1].textContent.includes('Test University'));
await click(button('Vezi chiriile'));
assert.equal(calls.at(-1), '/chirii/bucuresti');

await render(DesktopHome, props);
await click(document.querySelector('input[placeholder="Alege orașul"]'));
await click(button('Cluj-Napoca'));
const universityInput = [...document.querySelectorAll('input')].find(el => el.placeholder.toLowerCase().includes('universitate'));
await click(universityInput);
assert(!document.body.textContent.includes('Other University'));
await click(button('U Test'));
await click(button('Mai multe filtre'));
const selectByOption = text => [...document.querySelectorAll('select')].find(el => [...el.options].some(option => option.text === text));
await select(selectByOption('Locuință întreagă'), 'entire');
await select(selectByOption('5+ camere'), '5');
await click(document.querySelector('input[placeholder="Toate zonele"]'));
await click(button('Centru'));
for (const [name, value] of Object.entries(numericFilters)) await input(document.getElementById(`home-desktop-${name}`), value);
for (const [name, value] of Object.entries(selectFilters)) await select(document.getElementById(`home-desktop-${name}`), value);
await click(button('ZZ/LL/AAAA'));
await click(button('Astăzi'));
await click(button('Vezi chirii'));
assert.deepEqual([...new URL(calls.at(-1), window.location.origin).searchParams].sort(), [...new URL(mobileUrl, window.location.origin).searchParams].sort());
assert.equal(new URL(calls.at(-1), window.location.origin).pathname, '/chirii/cluj-napoca/u-test');

const completeParams = new URL(calls.at(-1), window.location.origin).searchParams;
assert.equal([...completeParams].length, 13);
assert.equal(completeParams.get('availableFrom'), dateFilter);
await click(button('Resetează filtrele'));
await click(button('Vezi chirii'));
assert.equal(calls.at(-1), '/chirii/cluj-napoca/u-test');
await click(document.querySelector('input[placeholder="Alege orașul"]'));
await click(button('București'));
await click(button('Vezi chirii'));
assert.equal(calls.at(-1), '/chirii/bucuresti');

for (const Component of [DesktopCity, MobileCity, University]) {
  window.history.replaceState({}, '', `/chirii/cluj-napoca${Component === University ? '/u-test' : ''}?listingType=rent&rooms=5&zona=centru`);
  await render(Component);
  assert(document.body.textContent.includes('Listing Alpha'));
  // A shared homepage URL restores every filter on a fresh results mount.
  window.history.replaceState({}, '', mobileUrl);
  await render(Component);
  assert(document.body.textContent.includes('Listing Alpha'));
  for (const title of ['Listing Beta','Listing Gamma','Wrong City Listing','Inactive Listing']) assert(!document.body.textContent.includes(title), title);
  // Query-only history navigation restores applied filters, including zone.
  await act(async () => { window.history.replaceState({}, '', '/chirii/cluj-napoca?rooms=6'); window.dispatchEvent(new window.PopStateEvent('popstate')); });
  assert(document.body.textContent.includes('Listing Beta'));
  assert(!document.body.textContent.includes('Listing Alpha'));
}
window.history.replaceState({}, '', '/chirii/cluj-napoca?universitate=u1&rooms=5&zona=centru');
await render(MobileCity);
assert.equal(new URL(calls.at(-1), window.location.origin).pathname, '/chirii/cluj-napoca/u-test');
assert.equal(new URL(calls.at(-1), window.location.origin).searchParams.get('zona'), 'centru');
await act(async () => root.unmount());
console.log('Rental search DOM tests passed: city-dependent universities, desktop/mobile homepage URL parity, complete mobile fields, reset, city/university result parity, history restore and legacy university URL migration.');


