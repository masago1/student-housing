import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(new URL('../app/login/page.js', import.meta.url), 'utf8');
const effectBody = source.match(/useEffect\(\(\) => \{([\s\S]*?)\}, \[nickname, cleanNicknameValue, mode, loading\]\);/)[1];
const runEffect = new Function('cleanNicknameValue', 'mode', 'loading',
  'checkNicknameAvailability', 'setNicknameCheck', 'setTimeout', 'clearTimeout', effectBody);

function effect(value, check, mode = 'register', loading = false) {
  const states = [];
  let callback;
  const cleanup = runEffect(value, mode, loading, check, state => states.push(state),
    (fn, delay) => { assert.equal(delay, 300); callback = fn; return 1; },
    id => { assert.equal(id, 1); callback = undefined; });
  return { states, cleanup, fire: () => callback?.() };
}

test('debounces, cancels earlier keystrokes, and skips invalid/login/loading inputs', async () => {
  let calls = 0;
  const check = async () => { calls++; return { data: null }; };
  const pending = effect('David', check);
  assert.equal(calls, 0);
  pending.cleanup();
  await pending.fire();
  assert.equal(calls, 0);
  for (const value of ['', 'da', 'bad%name', 'a'.repeat(31)]) await effect(value, check).fire();
  await effect('David', check, 'login').fire();
  await effect('David', check, 'register', true).fire();
  assert.equal(calls, 0);
  const latest = effect('David1', check);
  await latest.fire();
  assert.deepEqual(latest.states, [{ value: 'David1', status: 'available' }]);
  assert.equal(calls, 1);
});

test('ignores stale responses and surfaces only current availability', async () => {
  let resolve;
  const old = effect('David', () => new Promise(done => { resolve = done; }));
  const inFlight = old.fire();
  old.cleanup();
  const current = effect('Other', async () => ({ data: null }));
  await current.fire();
  resolve({ data: { id: 'taken' } });
  await inFlight;
  assert.deepEqual(old.states, []);
  assert.equal(current.states[0].status, 'available');
  for (const [result, status] of [[{ data: { id: 'taken' } }, 'taken'],
    [{ error: new Error('offline') }, 'error']]) {
    const next = effect('David', async () => result);
    await next.fire();
    assert.equal(next.states[0].status, status);
  }
  const failed = effect('David', async () => { throw new Error('offline'); });
  await failed.fire();
  assert.equal(failed.states[0].status, 'error');
});

test('exact duplicates are taken while case variants and literal underscores stay distinct', async () => {
  const body = source.match(/function checkNicknameAvailability\(value\) \{([\s\S]*?)\n\}/)[1];
  const values = [];
  const existing = new Set(['David', 'david_1']);
  let selected;
  const query = {
    from: table => { assert.equal(table, 'public_profiles'); return query; },
    select: columns => { assert.equal(columns, 'id'); return query; },
    eq: (column, value) => { assert.equal(column, 'nickname'); values.push(value); selected = value; return query; },
    limit: count => { assert.equal(count, 1); return query; },
    maybeSingle: async () => ({ data: existing.has(selected) ? { id: 'owner' } : null }),
  };
  const check = new Function('supabase', 'value', body);
  for (const [name, status] of [['David', 'taken'], ['david', 'available'],
    ['DAVID', 'available'], ['david_1', 'taken'], ['davidX1', 'available']]) {
    const current = effect(name, value => check(query, value));
    await current.fire();
    assert.deepEqual(current.states, [{ value: name, status }]);
  }
  assert.deepEqual(values, ['David', 'david', 'DAVID', 'david_1', 'davidX1']);
});

const submitBody = source.match(/const handleSubmit = async \(event\) => \{([\s\S]*?)\n  \};/)[1];
async function submit({ taken = false, lookup = {}, signupError = null, profileError = null,
  emailTaken = false, emailLookup = false, emailFailure = false,
  signupData = { user: { id: 'user' }, session: {} } } = {}) {
  const states = [];
  const errors = [];
  const emailStates = [];
  let signups = 0;
  let writes = 0;
  let redirects = 0;
  const noop = () => {};
  const scope = {
    loading: false, mode: 'register', nicknameTaken: taken,
    emailTaken, setEmailCheck: value => emailStates.push(value),
    checkEmailAvailability: async () => {
      if (emailFailure) throw new Error('offline');
      return emailLookup;
    },
    name: 'David', nickname: 'David', email: 'test@example.com', password: 'abcdef', confirmPassword: 'abcdef',
    setError: value => errors.push(value), setMessage: noop, setLoading: noop,
    setNicknameCheck: value => states.push(value), setName: noop, setNickname: noop,
    setEmail: noop, setPassword: noop, setConfirmPassword: noop,
    checkNicknameAvailability: async () => lookup,
    console: { error: noop }, router: { replace: () => redirects++ },
    supabase: {
      auth: { signUp: async () => {
        signups++;
        return { data: signupData, error: signupError };
      } },
      from: () => ({ upsert: async () => { writes++; return { error: profileError }; } }),
    },
  };
  const run = new Function(...Object.keys(scope), `return async event => {${submitBody}}`)(...Object.values(scope));
  await run({ preventDefault: noop });
  return { states, emailStates, errors, signups, writes, redirects };
}

test('blocks taken names, rechecks before signup, and fails closed on lookup errors', async () => {
  assert.equal((await submit({ taken: true })).signups, 0);
  const taken = await submit({ lookup: { data: { id: 'owner' } } });
  assert.equal(taken.signups, 0);
  assert.equal(taken.states[0].status, 'taken');
  const failed = await submit({ lookup: { error: { message: 'offline' } } });
  assert.equal(failed.signups, 0);
  assert(failed.errors.some(Boolean));
});

test('unique violations use inline error and available usernames complete existing flow', async () => {
  for (const options of [{ profileError: { code: '23505' } }, { signupError: { code: '23505' } }]) {
    const result = await submit(options);
    assert.equal(result.states[0].status, 'taken');
    assert.equal(result.redirects, 0);
  }
  const result = await submit();
  assert.equal(result.signups, 1);
  assert.equal(result.writes, 1);
  assert.equal(result.redirects, 1);
  assert(source.includes('disabled={loading || (mode === "register" && (nicknameTaken || emailTaken))}'));
  assert(source.includes('This username is already taken. Please choose another one.'));
});

test('email checks block known and newly taken addresses; outages do not create accounts', async () => {
  assert.equal((await submit({ emailTaken: true })).signups, 0);
  const result = await submit({ emailLookup: true });
  assert.equal(result.signups, 0);
  assert.deepEqual(result.emailStates, [{ value: 'test@example.com', status: 'taken' }]);
  const failed = await submit({ emailFailure: true });
  assert.equal(failed.signups, 0);
  assert(failed.errors.some(Boolean));
});

test('Auth duplicate-email errors and obscured duplicates show inline error without profile writes', async () => {
  for (const options of [
    { signupError: { code: 'email_exists' } },
    { signupError: { code: 'user_already_exists' } },
    { signupError: { message: 'User already registered' } },
    { signupData: { user: { id: 'obscured', identities: [] }, session: null } },
  ]) {
    const result = await submit(options);
    assert.equal(result.emailStates[0].status, 'taken');
    assert.equal(result.states.length, 0);
    assert.equal(result.writes, 0);
    assert.equal(result.redirects, 0);
  }
  const pendingConfirmation = await submit({ signupData: {
    user: { id: 'new', identities: [{ provider: 'email' }] }, session: null,
  } });
  assert.equal(pendingConfirmation.emailStates.length, 0);
  assert.equal(pendingConfirmation.errors.filter(Boolean).length, 0);
});
