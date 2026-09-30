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
const output = join(process.argv[2], 'property-gallery.cjs');
await build({
  entryPoints: [fileURLToPath(new URL('../app/components/PropertyGallery.js', import.meta.url))],
  outfile: output, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.js': 'jsx' },
  plugins: [{ name: 'fixture', setup(builder) {
    builder.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, args => ({ path: require.resolve(args.path), external: true }));
    builder.onResolve({ filter: /lib\/supabase$/ }, () => ({ path: 'fixture-db', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const supabase = globalThis.galleryTestDatabase;' }));
  } }],
});
const Gallery = require(output).default;
const root = createRoot(document.getElementById('root'));
const region = () => document.querySelector('[role="region"]');
const dialog = () => document.querySelector('[role="dialog"]');
const button = (scope, label) => [...scope.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === label);
const src = scope => scope.querySelector('img').getAttribute('src');
async function click(el, detail = 1) { await act(async () => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail }))); }
async function key(key) { await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }))); }
async function swipe(target, x1, y1, x2, y2) {
  await act(async () => {
    for (const [type, property, x, y] of [['touchstart', 'touches', x1, y1], ['touchmove', 'touches', x2, y2], ['touchend', 'changedTouches', x2, y2]]) {
      const event = new window.Event(type, { bubbles: true });
      Object.defineProperty(event, property, { value: [{ clientX: x, clientY: y }] });
      target.dispatchEvent(event);
    }
  });
}
await act(async () => root.render(React.createElement(Gallery, { images: ['a.jpg', 'b.jpg', 'c.jpg'], title: 'Test' })));
assert.equal(region().querySelectorAll('img').length, 1);
assert.equal(src(region()), 'a.jpg');
assert.equal(region().style.width, '100%');
assert.equal(region().querySelector('img').style.objectFit, 'contain');
await click(button(region(), 'Fotografia anterioară'));
assert.equal(src(region()), 'c.jpg');
assert.equal(dialog(), null);
await click(button(region(), 'Fotografia următoare'));
assert.equal(src(region()), 'a.jpg');
await swipe(region().querySelector('img'), 250, 100, 80, 105);
assert.equal(src(region()), 'b.jpg');
await click(region().querySelector('img'));
assert.equal(dialog(), null); // Synthetic click after swiping must not open the viewer.
await swipe(region().querySelector('img'), 80, 100, 250, 105);
assert.equal(src(region()), 'a.jpg');
await swipe(region().querySelector('img'), 100, 100, 105, 250);
assert.equal(src(region()), 'a.jpg'); // Vertical scrolling does not change the photo.
await click(button(region(), 'Fotografia următoare'));
// A new tap clears the previous swipe suppression.
await swipe(region().querySelector('img'), 100, 100, 100, 100);
const trigger = region().querySelector('button');
trigger.focus();
await click(trigger);
assert.equal(src(dialog()), 'b.jpg');
assert(dialog().textContent.includes('2 / 3'));
assert.equal(document.body.style.overflow, 'hidden');
await click(button(dialog(), 'Fotografia următoare'));
assert.equal(src(dialog()), 'c.jpg');
await key('ArrowRight'); assert.equal(src(dialog()), 'a.jpg');
await key('ArrowLeft'); assert.equal(src(dialog()), 'c.jpg');
await swipe(dialog().querySelector('img'), 250, 100, 80, 105);
assert.equal(src(dialog()), 'a.jpg');
await key('Escape'); assert.equal(dialog(), null);
assert.equal(document.body.style.overflow, 'auto');
assert.equal(document.activeElement, trigger);
assert.equal(src(region()), 'b.jpg');
await click(trigger);
assert.equal(src(dialog()), 'b.jpg');
await click(button(dialog(), 'Închide galeria'));
assert.equal(dialog(), null);
await act(async () => root.render(React.createElement(Gallery, { key: 'single', images: ['single.jpg'] })));
assert.equal(region().querySelectorAll('button').length, 1);
assert(region().textContent.includes('1 / 1'));
await swipe(region().querySelector('img'), 250, 100, 80, 105);
assert.equal(src(region()), 'single.jpg');
await act(async () => root.render(React.createElement(Gallery, { key: 'empty', images: [] })));
assert(document.body.textContent.includes('Fotografie indisponibilă'));
assert.equal(document.querySelector('img'), null);
await act(async () => root.unmount());
console.log('Detail gallery tests passed: one image, wraparound arrows, swipe, vertical scroll, synthetic click suppression, current-image lightbox, keyboard, close, scroll lock, focus, single/empty images.');
