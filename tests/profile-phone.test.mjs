import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeProfilePhone, profilePhoneDisplay, isValidRomanianMobilePhone } from '../app/lib/phone.js';

test('all Romanian representations resolve to one E.164 number', () => {
  for (const value of ['0722 377 995', '0722377995', '+40 722 377 995', '+40722377995', '0040 722 377 995']) {
    assert.equal(normalizeProfilePhone(value), '+40722377995');
    assert.deepEqual(profilePhoneDisplay(value), { country: 'RO', national: '722 377 995' });
  }
});

test('country metadata validates and formats international numbers and preserves Italian leading zero', () => {
  for (const [country, value, expected] of [
    ['RO', '722377995', '+40722377995'], ['DE', '01512 3456789', '+4915123456789'],
    ['IT', '3471234567', '+393471234567'], ['RS', '0641234567', '+381641234567'],
    ['IT', '02 3661 8300', '+390236618300'], ['US', '(202) 555-0123', '+12025550123'],
  ]) {
    assert.equal(normalizeProfilePhone(value, country), expected);
    const display = profilePhoneDisplay(expected);
    assert.equal(display.country, country);
    assert(!display.national.startsWith('+'));
    assert.equal(normalizeProfilePhone(display.national, display.country), expected);
    assert(isValidRomanianMobilePhone(expected)); // Compatibility with existing listing gates.
  }
  assert.equal(profilePhoneDisplay('+4915123456789').national, '1512 3456789');
  assert.equal(profilePhoneDisplay('+393471234567').national, '347 123 4567');
});

test('invalid, ambiguous non-geographic and extension numbers cannot be saved', () => {
  for (const value of ['', '123', 'Call +40722377995', '+40722377995 ext 12', '+80012345678', '+999123456789', '07223779951234567890']) {
    assert.equal(normalizeProfilePhone(value), null);
  }
});

const page = readFileSync(new URL('../app/dashboard/page.js', import.meta.url), 'utf8');
const body = page.match(/const saveProfile =\s*async \(\) => \{([\s\S]*?)\n    \};/)[1];

async function save({ current = { id: 'me', nickname: 'David', phone: null },
  input = '0722 377 995', country = 'RO', taken = false, writeError = null } = {}) {
  const phoneErrors = [], writes = [], checks = [], locked = [], displays = [];
  let reads = 0;
  const noop = () => {};
  const builder = {
    select: () => builder, eq: () => builder, is: () => builder,
    maybeSingle: async () => { reads++; return { data: reads === 1 ? current : { phone: '+4915123456789' } }; },
    update: value => { writes.push(value); return builder; },
    insert: value => { writes.push(value); return builder; },
    single: async () => ({ error: writeError }),
  };
  const scope = {
    user: { id: 'me' }, profileSaving: false, profileName: 'David', profileNickname: 'David',
    profilePhone: input, phoneCountry: country, normalizeProfilePhone, profilePhoneDisplay,
    supabase: { from: () => builder, rpc: async (_, args) => { checks.push(args); return { data: taken }; },
      auth: { updateUser: async () => ({}) } },
    setSavedNickname: noop, setProfileNickname: noop, setProfileSuccess: noop,
    setSavedPhone: v => locked.push(v), setProfilePhone: v => displays.push(v), setPhoneCountry: noop,
    setPhoneError: v => phoneErrors.push(v), setError: noop, setProfileSaving: noop,
    setUser: noop, setProfileName: noop, setPhoneRequired: noop,
    loadConversationDetails: async () => {}, conversations: [], console: { error: noop },
  };
  await new Function(...Object.keys(scope), `return async () => {${body}}`)(...Object.values(scope))();
  return { phoneErrors, writes, checks, locked, displays };
}

test('save checks normalized duplicate, persists E.164 and locks only after success', async () => {
  const result = await save();
  assert.deepEqual(result.checks, [{ candidate_phone: '+40722377995' }]);
  assert.equal(result.writes[0].phone, '+40722377995');
  assert(result.locked.includes('+40722377995'));
  assert(result.displays.includes('722 377 995'));
  const duplicate = await save({ taken: true });
  assert.equal(duplicate.writes.length, 0);
  assert(duplicate.phoneErrors.includes('Acest număr de telefon este asociat altui cont.'));
  assert.equal(duplicate.locked.length, 0);
});

test('own saved phone is never checked as duplicate or overwritten by stale input', async () => {
  const result = await save({ current: { id: 'me', nickname: 'David', phone: '+4915123456789' } });
  assert.equal(result.checks.length, 0);
  assert.equal('phone' in result.writes[0], false);
  assert(result.locked.includes('+4915123456789'));
});

test('database race fallback shows exact inline duplicate and handles another tab saving first', async () => {
  const duplicate = await save({ writeError: { code: '23505', message: 'profiles_phone_key' } });
  assert(duplicate.phoneErrors.includes('Acest număr de telefon este asociat altui cont.'));
  assert.equal(duplicate.locked.length, 0);
  const changed = await save({ writeError: { code: '23514', message: 'profile_phone_immutable' } });
  assert(changed.locked.includes('+4915123456789'));
  assert(changed.phoneErrors.some(v => v.includes('nu poate fi schimbat')));
});
