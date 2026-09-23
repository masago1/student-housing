import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const { parseConsent, consentChoice, CONSENT_KEY } = await import(
  `data:text/javascript;base64,${Buffer.from(read('app/lib/consent.js')).toString('base64')}`
);

test('absent, corrupt, old and malformed preferences never enable optional services', () => {
  for (const value of [null, '', '{', 'null', '{}', 'true',
    '{"necessary":false,"externalServices":true,"version":1}',
    '{"necessary":true,"externalServices":"true","version":1}',
    '{"necessary":true,"externalServices":true,"version":0}']) {
    assert.equal(parseConsent(value), null);
  }
});

test('choices round-trip with only the approved fields, always necessary=true', () => {
  assert.equal(CONSENT_KEY, 'shaus-consent');
  for (const externalServices of [false, true]) {
    const choice = { necessary: true, externalServices, version: 1 };
    assert.deepEqual(consentChoice(externalServices), choice);
    assert.deepEqual(parseConsent(JSON.stringify({ ...choice, email: 'discard-me' })), choice);
  }
  assert.equal(consentChoice('true').externalServices, false);
});

test('Mapbox import is behind consent; revocation guards both pending import and rendering', () => {
  const wrapper = read('app/components/ApproximateLocationMap.js');
  assert(!/import\s+\w+\s+from\s+["']mapbox-gl/.test(wrapper));
  assert(wrapper.indexOf('if (!externalServices) return;') < wrapper.indexOf('import("./MapboxLocationMap")'));
  assert(wrapper.includes('if (!cancelled) setMapComponent'));
  assert(wrapper.includes('cancelled = true'));
  assert(wrapper.includes('externalServices && MapComponent'));
  const map = read('app/components/MapboxLocationMap.js');
  assert(map.includes('performanceMetricsCollection: false'));
  assert(map.includes('map.remove()'));
  assert(map.includes('createCircle([lng, lat], 500)'));
  assert(map.includes('mapbox://styles/mapbox/streets-v12'));
  assert(map.includes('zoom: 14.2'));
  assert(map.includes('attributionControl: true'));
});
