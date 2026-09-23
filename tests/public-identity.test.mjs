import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const add = read('app/adaugaproprietate/page.js');
const dashboard = read('app/dashboard/page.js');

test('new listing snapshot uses current database nickname, never stale form or real name', () => {
  const expression = add.match(/const ownerName =\s*([\s\S]*?);/)[1];
  const snapshot = new Function('currentProfile', 'form', 'user', `return ${expression};`);
  for (const nickname of [' public_handle ', '', null, undefined]) {
    assert.equal(snapshot({ nickname, name: 'PRIVATE NAME' },
      { owner_name: 'STALE REAL NAME' }, { user_metadata: { name: 'PRIVATE METADATA' } }),
    nickname?.trim() || '');
  }
  assert.equal((add.match(/\.select\("nickname, phone"\)/g) || []).length, 2);
  assert(/owner_name:\s*ownerName/.test(add));
});

test('message labels never fall back to another participant real name', () => {
  const expression = dashboard.match(/profile\.id\s*\]\s*=\s*([\s\S]*?);/)[1];
  const label = new Function('profile', `return ${expression};`);
  assert.equal(label({ nickname: ' public_handle ', name: 'PRIVATE NAME' }), 'public_handle');
  for (const nickname of ['', '  ', null, undefined]) {
    assert.equal(label({ nickname, name: 'PRIVATE NAME' }), 'Utilizator');
  }
});

test('all public-profile projections use only id and nickname', () => {
  let count = 0;
  for (const source of [dashboard, read('app/login/page.js')]) {
    for (const query of source.matchAll(/\.from\("public_profiles"\)\s*\.select\("([^"]+)"\)/g)) {
      count++;
      for (const column of query[1].split(',').map(x => x.trim())) assert(['id', 'nickname'].includes(column));
    }
  }
  assert.equal(count, 3);
  assert(dashboard.includes('.select("name, nickname, phone")'));
  assert(dashboard.includes('readOnly={Boolean(savedNickname)}'));
});

test('property contact still uses the listing snapshot and retains phone and messaging', () => {
  const property = read('app/proprietate/[id]/page.js');
  assert(property.includes('listing.owner_name?.trim()'));
  assert(property.includes('<PhoneRevealButton phone={ownerPhone}'));
  assert(property.includes('ownerId={listing.user_id}'));
  assert(!/\.from\("profiles"\)/.test(property));
});
