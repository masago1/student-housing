// DOM integration tests. Pass a temporary directory containing esbuild and jsdom.
// No test dependencies are added to the production package.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const temporary = createRequire(join(process.argv[2], 'package.json'));
const { build } = temporary('esbuild');
const { JSDOM } = temporary('jsdom');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { url: 'https://shaus.example/chirii/test' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let restoredScroll;
window.scrollTo = (...args) => { restoredScroll = args; };
Object.defineProperty(window, 'scrollY', { value: 123, configurable: true });
document.body.style.overflow = 'auto';
const output = join(process.argv[2], 'gallery.cjs');
await build({
  entryPoints: [fileURLToPath(new URL('../app/components/ListingImageGallery.js', import.meta.url))],
  outfile: output, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.js': 'jsx' },
  plugins: [{ name: 'fixture', setup(builder) {
    builder.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, args => ({ path: require.resolve(args.path), external: true }));
    builder.onResolve({ filter: /lib\/supabase$/ }, () => ({ path: 'fixture-db', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const supabase = globalThis.galleryTestDatabase;' }));
  } }],
});
const requests = [];
let resolveImages;
globalThis.galleryTestDatabase = { from: table => {
  assert.equal(table, 'listing_images');
  return { select: columns => {
    assert.equal(columns, 'image_url');
    return { eq: (column, id) => {
      assert.equal(column, 'listing_id'); requests.push(id);
      return new Promise(resolve => { resolveImages = resolve; });
    } };
  } };
} };
const Gallery = require(output).default;
const root = createRoot(document.getElementById('root'));
const h = React.createElement;
const image = url => h('img', { src: url, alt: 'card' });
const button = label => [...document.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === label);
const dialog = () => document.querySelector('[role="dialog"]');
const src = () => dialog()?.querySelector('img').getAttribute('src');
async function click(el) { await act(async () => el.click()); }
async function key(value) { await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true }))); }
async function swipe(x1, y1, x2, y2, target = dialog().querySelector('img')) {
  await act(async () => {
    const start = new window.Event('touchstart', { bubbles: true });
    Object.defineProperty(start, 'touches', { value: [{ clientX: x1, clientY: y1 }] });
    target.dispatchEvent(start);
    const end = new window.Event('touchend', { bubbles: true });
    Object.defineProperty(end, 'changedTouches', { value: [{ clientX: x2, clientY: y2 }] });
    target.dispatchEvent(end);
  });
}

await act(async () => root.render(h('div', null,
  h(Gallery, { images: ['a.jpg', 'b.jpg', 'c.jpg'], initialIndex: 1, title: 'A' }, image('b.jpg')),
  h(Gallery, { images: ['other.jpg'], title: 'B' }, image('other.jpg')),
  h('a', { href: '/proprietate/A' }, 'Vezi anunțul'))));
const trigger = button('Deschide fotografiile: A');
trigger.focus();
await click(trigger);
assert.equal(src(), 'b.jpg');
assert(dialog().textContent.includes('2 / 3'));
assert.equal(document.body.style.position, 'fixed');
assert.equal(document.body.style.overflow, 'hidden');
assert.equal(dialog().querySelector('img').style.objectFit, 'contain');
assert.equal(requests.length, 0); // Reuses the supplied card image array.
button('Fotografia următoare').focus();
await key('Tab');
assert.equal(document.activeElement, button('Închide galeria'));
await click(button('Fotografia următoare'));
assert.equal(src(), 'c.jpg');
await key('ArrowRight'); assert.equal(src(), 'a.jpg');
await key('ArrowLeft'); assert.equal(src(), 'c.jpg');
await click(button('Fotografia anterioară')); assert.equal(src(), 'b.jpg');
await swipe(250, 100, 80, 105); assert.equal(src(), 'c.jpg');
await swipe(80, 100, 250, 105); assert.equal(src(), 'b.jpg');
await swipe(100, 100, 105, 250); assert.equal(src(), 'b.jpg'); // Vertical motion does not navigate.
await key('Escape');
assert.equal(dialog(), null);
assert.equal(document.body.style.overflow, 'auto');
assert.equal(document.body.style.position, '');
assert.deepEqual(restoredScroll, [0, 123]);
assert.equal(document.activeElement, trigger);
assert.equal(document.querySelector('a').getAttribute('href'), '/proprietate/A');
await click(button('Deschide fotografiile: B')); assert.equal(src(), 'other.jpg');
assert(dialog().textContent.includes('1 / 1'));
assert.equal(button('Fotografia următoare'), undefined);
await key('ArrowRight'); assert.equal(src(), 'other.jpg');
await click(button('Închide galeria')); assert.equal(dialog(), null);

await act(async () => root.render(h(Gallery, { key: 'lazy', listingId: 'only-this-listing', cover: 'cover.jpg', title: 'Lazy' }, image('cover.jpg'))));
await click(button('Deschide fotografiile: Lazy'));
assert.equal(src(), 'cover.jpg');
assert.deepEqual(requests, ['only-this-listing']);
await act(async () => resolveImages({ data: [{ image_url: 'cover.jpg' }, { image_url: 'extra.jpg' }] }));
assert(dialog().textContent.includes('1 / 2'));
await key('ArrowRight'); assert.equal(src(), 'extra.jpg');
await click(button('Închide galeria'));
await click(button('Deschide fotografiile: Lazy'));
await click(button('Închide galeria'));
await act(async () => resolveImages({ data: [{ image_url: 'stale.jpg' }] }));
assert.equal(dialog(), null); // A pending fetch cannot reopen a closed gallery.

await act(async () => root.render(h(Gallery, { key: 'carousel', carousel: true, images: ['a.jpg', 'b.jpg', 'c.jpg'], title: 'Card' }, image('a.jpg'))));
const frame = () => document.querySelector('.shaus-card-image-fade');
await click(button('Imaginea următoare'));
assert.equal(dialog(), null, 'Card arrows must not open the viewer');
assert.equal(frame().getAttribute('src'), 'b.jpg');
assert.equal(frame().style.opacity, '0', 'Wait for the incoming image to load');
assert.equal(document.querySelector('img[aria-hidden]').getAttribute('src'), 'a.jpg');
await act(async () => frame().dispatchEvent(new window.Event('load')));
assert.equal(frame().style.opacity, '1');
assert.equal(frame().style.objectFit, 'cover');
assert(document.querySelector('style').textContent.includes('180ms'));
assert(document.querySelector('style').textContent.includes('prefers-reduced-motion'));
assert(document.body.textContent.includes('2 / 3'));
await click(button('Deschide fotografiile: Card'));
assert.equal(src(), 'b.jpg', 'Viewer starts on selected card image');
await key('Escape');
await click(button('Imaginea precedentă'));
assert(document.body.textContent.includes('1 / 3'));
await swipe(250, 100, 80, 105, button('Deschide fotografiile: Card'));
assert(document.body.textContent.includes('2 / 3'));
await click(button('Deschide fotografiile: Card'));
assert.equal(dialog(), null, 'Synthetic click after swipe is suppressed');
await swipe(100, 100, 105, 250, button('Deschide fotografiile: Card'));
assert(document.body.textContent.includes('2 / 3'), 'Vertical scroll must not change image');
await act(async () => root.render(h(Gallery, { key: 'single-card', carousel: true, images: ['a.jpg'], title: 'Single' }, image('a.jpg'))));
assert.equal(button('Imaginea următoare'), undefined);
let controlledDirection;
await act(async () => root.render(h(Gallery, { key: 'controlled-card', carousel: true, images: ['a.jpg', 'b.jpg'], initialIndex: 1,
  onIndexChange: direction => { controlledDirection = direction; }, title: 'Controlled' }, image('b.jpg'))));
assert.equal(button('Imaginea următoare'), undefined, 'Desktop retains its existing external arrows/counter');
await swipe(250, 100, 80, 105, button('Deschide fotografiile: Controlled'));
assert.equal(controlledDirection, 1);
await act(async () => root.render(h(Gallery, { key: 'fetched-card', carousel: true, listingId: 'card-images', cover: 'cover.jpg', title: 'Fetched' }, image('cover.jpg'))));
assert.equal(requests.at(-1), 'card-images', 'Mobile/home fetch images for card navigation before opening');
await act(async () => resolveImages({ data: [{ image_url: 'cover.jpg' }, { image_url: 'extra.jpg' }] }));
assert(document.body.textContent.includes('1 / 2'));
await click(button('Imaginea următoare'));
await click(button('Deschide fotografiile: Fetched'));
assert.equal(src(), 'extra.jpg');
await key('Escape');
await act(async () => root.unmount());

const desktop = readFileSync(new URL('../app/chirii/[city]/CityListingsClient.js', import.meta.url), 'utf8');
assert(desktop.includes('images={images} initialIndex={currentImageIndex}'));
assert.equal((desktop.match(/changeListingImage\(\s*listing\.id/g) || []).length, 3);
for (const path of ['../app/chirii/[city]/CityListingsClient.js', '../app/chirii/[city]/MobileCityListingsClient.js']) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  assert(source.includes('Vezi anunțul'));
  assert(!source.includes('Vezi proprietatea'));
}
console.log('Gallery tests passed: current image, listing isolation, arrows, keyboard, swipe, close, focus, scroll lock, lazy images and stale responses.');
