// DOM checks using the existing temporary esbuild/jsdom test dependencies.
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
globalThis.localStorage = window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let observerCallback;
let disconnected = 0;
globalThis.ResizeObserver = class { constructor(callback) { observerCallback = callback; } observe() {} disconnect() { disconnected++; } };
window.HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open', ''); };
window.HTMLDialogElement.prototype.close = function() { this.removeAttribute('open'); };
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const output = join(process.argv[2], 'consent-banner.cjs');
await build({ entryPoints: [fileURLToPath(new URL('../app/components/ConsentProvider.js', import.meta.url))], outfile: output,
  bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.js': 'jsx' },
  plugins: [{ name: 'fixtures', setup(builder) {
    builder.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, args => ({ path: require.resolve(args.path), external: true }));
    builder.onResolve({ filter: /\.module\.css$/ }, () => ({ path: 'styles', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default { banner:"banner", inner:"inner", copy:"copy", actions:"actions", dialog:"dialog", category:"category" };' }));
  } }],
});
const { default: Provider, useConsent } = require(output);
function Controls() {
  const consent = useConsent();
  return React.createElement('div', null,
    React.createElement('output', null, String(consent.externalServices)),
    React.createElement('button', { onClick: consent.openPreferences }, 'Reopen'),
    React.createElement('span', { id: 'storage-error' }, consent.storageError));
}
const root = createRoot(document.getElementById('root'));
let generation = 0;
async function render() { await act(async () => root.render(React.createElement(Provider, { key: ++generation }, React.createElement(Controls)))); }
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent === text);
async function click(text) { await act(async () => button(text).click()); }
const banner = () => document.querySelector('.banner');
const stored = () => JSON.parse(localStorage.getItem('shaus-consent'));
await render();
assert(banner());
assert.equal(document.querySelector('output').textContent, 'false');
assert(!document.querySelector('dialog').hasAttribute('open'));
// The spacer follows wrapped page/footer content and tracks the actual banner height.
banner().getBoundingClientRect = () => ({ height: 120 });
await act(async () => observerCallback());
assert.equal(document.querySelector('[aria-hidden="true"]').style.height, '120px');
await click('Doar necesare');
assert.equal(banner(), null);
assert.equal(document.querySelector('[aria-hidden="true"]'), null);
assert.deepEqual(stored(), { necessary: true, externalServices: false, version: 1 });
assert(disconnected > 0);
await render(); assert.equal(banner(), null);
await click('Reopen'); assert(document.querySelector('dialog').hasAttribute('open'));
await act(async () => document.querySelector('input:not(:disabled)').click());
await click('Salvează preferințele');
assert.equal(stored().externalServices, true);
await render(); assert.equal(banner(), null);
assert.equal(document.querySelector('output').textContent, 'true');
localStorage.clear(); await render();
await click('Acceptă'); assert.equal(stored().externalServices, true);
await render(); assert.equal(banner(), null);
localStorage.setItem('shaus-consent', '{'); await render(); assert(banner());
await click('Preferințe'); assert(document.querySelector('dialog').hasAttribute('open'));
await click('Anulează'); assert(banner());
const setItem = window.Storage.prototype.setItem;
window.Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
await click('Doar necesare');
assert.equal(banner(), null);
assert(document.getElementById('storage-error').textContent.includes('nu poate fi memorată'));
window.Storage.prototype.setItem = setItem;
await act(async () => root.unmount());
console.log('Consent banner checks passed: persistence, accept/reject, preferences, reload, corrupt/blocked storage and adaptive bottom spacing.');
