import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const route = read('app/api/auth/email-availability/route.js')
  .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');

function endpoint({ result = { data: false }, missingKey = false, vercel = '1', throws = false } = {}) {
  const calls = [];
  const process = { env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: missingKey ? '' : 'server-secret', VERCEL: vercel,
  } };
  const createClient = (url, key, options) => {
    assert.equal(key, 'server-secret');
    assert.equal(options.auth.persistSession, false);
    return { rpc: async (name, args) => {
      calls.push({ name, args });
      if (throws) throw new Error('sensitive provider details');
      return result;
    } };
  };
  const POST = new Function('createClient', 'createHmac', 'isIP', 'process',
    `${route}\nreturn POST;`)(createClient, createHmac, isIP, process);
  return { POST, calls };
}

function request(body = { email: 'David@Example.com' }, headers = {}) {
  return new Request('https://shaus.example/api/auth/email-availability', {
    method: 'POST', headers: {
      origin: 'https://shaus.example', 'content-type': 'application/json',
      'x-vercel-forwarded-for': '203.0.113.2', ...headers,
    }, body: JSON.stringify(body),
  });
}

test('server normalizes email, returns only a boolean, and hashes the trusted client address', async () => {
  for (const registered of [true, false]) {
    const f = endpoint({ result: { data: registered } });
    const response = await f.POST(request({ email: '  DAVID@Example.com  ' }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { registered });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(f.calls[0].name, 'check_signup_email');
    assert.equal(f.calls[0].args.candidate_email, 'david@example.com');
    assert.equal(f.calls[0].args.requester_key,
      createHmac('sha256', 'server-secret').update('email-check:203.0.113.2').digest('hex'));
  }
});

test('rejects cross-origin, missing origin, malformed and oversized requests before privileged queries', async () => {
  const f = endpoint();
  for (const [req, status] of [
    [request(undefined, { origin: 'https://evil.example' }), 403],
    [request(undefined, { origin: '' }), 403],
    [request(undefined, { 'content-type': 'text/plain' }), 400],
    [request({ email: 'invalid' }), 400],
    [request({ email: 'test@example.com', userId: 'victim' }), 400],
    [request({ email: 'a'.repeat(2000) }), 413],
    [request(null), 400],
  ]) assert.equal((await f.POST(req)).status, status);
  assert.equal(f.calls.length, 0);
});

test('missing setup, rate limits, and provider failures never claim availability or leak details', async () => {
  for (const [options, status] of [
    [{ missingKey: true }, 503], [{ result: { data: null } }, 429],
    [{ result: { error: { message: 'sensitive provider details' } } }, 503],
    [{ throws: true }, 503], [{ result: { data: {} } }, 503],
  ]) {
    const f = endpoint(options);
    const response = await f.POST(request());
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.registered, undefined);
    assert(!JSON.stringify(body).includes('sensitive'));
    if (status === 429) assert.equal(response.headers.get('retry-after'), '60');
  }
});

test('untrusted hosts cannot rotate rate buckets by spoofing forwarded IP headers', async () => {
  // Explicitly use a non-Vercel deployment.
  const local = endpoint({ vercel: '0' });
  await local.POST(request());
  await local.POST(request(undefined, { 'x-vercel-forwarded-for': '198.51.100.9' }));
  assert.equal(local.calls[0].args.requester_key, local.calls[1].args.requester_key);
});

const page = read('app/login/page.js');
const effectBody = page.match(/useEffect\(\(\) => \{\s*if \(mode !== "register" \|\| loading \|\| normalizedEmail[\s\S]*?\}, \[email, normalizedEmail, mode, loading\]\);/)[0]
  .replace(/^useEffect\(\(\) => \{/, '').replace(/\}, \[email, normalizedEmail, mode, loading\]\);$/, '');
const runEffect = new Function('normalizedEmail', 'mode', 'loading', 'checkEmailAvailability',
  'setEmailCheck', 'setTimeout', 'clearTimeout', effectBody);

function effect(value, check, mode = 'register') {
  let callback;
  const states = [];
  const cleanup = runEffect(value, mode, false, check, s => states.push(s),
    (fn, ms) => { assert.equal(ms, 300); callback = fn; return 1; }, () => { callback = null; });
  return { cleanup, states, fire: () => callback?.() };
}

test('email debounce cancels old inputs, skips login and discards stale responses', async () => {
  let calls = 0;
  const check = async () => { calls++; return false; };
  const pending = effect('test@example.com', check);
  assert.equal(calls, 0);
  pending.cleanup();
  await pending.fire();
  await effect('', check).fire();
  await effect('invalid', check).fire();
  await effect('test@example.com', check, 'login').fire();
  assert.equal(calls, 0);
  let resolve, signal;
  const old = effect('old@example.com', (_, s) => {
    signal = s;
    return new Promise(done => { resolve = done; });
  });
  const running = old.fire();
  old.cleanup();
  assert(signal.aborted);
  const next = effect('new@example.com', check);
  await next.fire();
  resolve(true);
  await running;
  assert.deepEqual(old.states, []);
  assert.equal(next.states[0].status, 'available');
});

test('email effect distinguishes taken and failed checks, and SQL restricts privileged access', async () => {
  const taken = effect('test@example.com', async () => true);
  await taken.fire();
  assert.equal(taken.states[0].status, 'taken');
  const failed = effect('test@example.com', async () => { throw new Error('offline'); });
  await failed.fire();
  assert.equal(failed.states[0].status, 'error');
  const sql = read('docs/email-availability-setup.sql');
  assert(sql.includes("SET search_path = ''"));
  assert(sql.includes('REVOKE ALL ON FUNCTION public.check_signup_email(text, text) FROM PUBLIC, anon, authenticated'));
  assert(sql.includes('GRANT EXECUTE ON FUNCTION public.check_signup_email(text, text) TO service_role'));
  assert(sql.includes('lower(u.email) = lower(btrim(candidate_email))'));
  assert(sql.includes('IF attempts > 20 THEN RETURN NULL'));
  assert(!page.includes('SUPABASE_SERVICE_ROLE_KEY'));
});
