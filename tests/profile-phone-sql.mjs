// Optional local PostgreSQL verification: pass a temporary PGlite dist/index.js path.
// This script uses only synthetic in-memory data and never connects to Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const sql = readFileSync(new URL('../docs/profile-phone-setup.sql', import.meta.url), 'utf8');
const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
    'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
  GRANT USAGE ON SCHEMA auth TO authenticated;
  CREATE TABLE public.profiles (id uuid PRIMARY KEY, name text, phone text);
  CREATE UNIQUE INDEX profiles_phone_key ON public.profiles(phone);
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated, service_role;
  INSERT INTO public.profiles VALUES
    ('00000000-0000-0000-0000-000000000001', 'A', '0722 377 995'),
    ('00000000-0000-0000-0000-000000000002', 'B', NULL),
    ('00000000-0000-0000-0000-000000000003', 'C', NULL);
`);
await db.exec(sql);
assert.equal((await db.query('SELECT phone FROM public.profiles WHERE name = $1', ['A'])).rows[0].phone, '+40722377995');
assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_index WHERE indrelid = 'public.profiles'::regclass AND indisunique")).rows[0].n, 2); // PK and reused index.
await db.exec(sql); // Rerunnable without changing existing phones.
await db.exec("SET ROLE authenticated; SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001'");
assert.equal((await db.query("SELECT public.profile_phone_taken('+40722377995') AS taken")).rows[0].taken, false);
await db.exec("SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002'");
assert.equal((await db.query("SELECT public.profile_phone_taken('+40722377995') AS taken")).rows[0].taken, true);
await assert.rejects(db.exec("UPDATE public.profiles SET phone = '+40722377995' WHERE name = 'B'"), e => e.code === '23505');
await assert.rejects(db.exec("UPDATE public.profiles SET phone = '+4915123456789' WHERE name = 'A'"), /profile_phone_immutable/);
await assert.rejects(db.exec("UPDATE public.profiles SET phone = NULL WHERE name = 'A'"), /profile_phone_immutable/);
await assert.rejects(db.exec("DELETE FROM public.profiles WHERE name = 'A'"), /profile_phone_immutable/);
await db.exec("UPDATE public.profiles SET name = 'A1', phone = '+40722377995' WHERE name = 'A'");
await assert.rejects(db.exec("UPDATE public.profiles SET phone = '0722377995' WHERE name = 'B'"), e => e.code === '23514');
const results = await Promise.allSettled([
  db.exec("UPDATE public.profiles SET phone = '+4915123456789' WHERE name = 'B'"),
  db.exec("UPDATE public.profiles SET phone = '+4915123456789' WHERE name = 'C'"),
]);
assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
assert.equal(results.find(x => x.status === 'rejected').reason.code, '23505');
await db.exec('RESET ROLE; SET ROLE anon');
await assert.rejects(db.exec("SELECT public.profile_phone_taken('+40722377995')"), e => e.code === '42501');
await db.exec("RESET ROLE; SET ROLE service_role; DELETE FROM public.profiles WHERE name = 'A1'; RESET ROLE");
await db.close();

// Legacy duplicates must abort without silently choosing an owner.
const duplicates = new PGlite();
await duplicates.exec(`
  CREATE TABLE public.profiles(id int, phone text);
  INSERT INTO public.profiles VALUES (1, '0722377995'), (2, '+40 722 377 995');
`);
await assert.rejects(duplicates.exec(sql), /share a normalized phone/);
await duplicates.exec('ROLLBACK');
assert.equal((await duplicates.query('SELECT phone FROM public.profiles WHERE id = 1')).rows[0].phone, '0722377995');
await duplicates.close();
console.log('Phone SQL passed: migration, index reuse, own-number exclusion, duplicate enforcement, immutability, permissions, deletion compatibility, duplicate rollback.');
