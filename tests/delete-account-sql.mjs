// Runs only against an isolated in-memory PostgreSQL fixture, never Supabase.
// Install @electric-sql/pglite in a test environment; optionally set PGLITE_MODULE
// to its absolute ESM entrypoint when keeping dependencies outside this repository.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const L1 = "11111111-0000-4000-8000-000000000001";
const L2 = "22222222-0000-4000-8000-000000000002";
const L3 = "33333333-0000-4000-8000-000000000003";
const C1 = "11111111-0000-4000-8000-000000000011";
const C2 = "22222222-0000-4000-8000-000000000012";
const C3 = "33333333-0000-4000-8000-000000000013";
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users, nickname text);
    CREATE TABLE public.listings(id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users);
    CREATE TABLE public.listing_images(id int PRIMARY KEY, listing_id uuid REFERENCES public.listings, storage_path text);
    CREATE TABLE public.listing_universities(listing_id uuid REFERENCES public.listings, university_id int);
    CREATE TABLE public.favorites(id int PRIMARY KEY, user_id uuid REFERENCES auth.users, listing_id uuid REFERENCES public.listings);
    CREATE TABLE public.conversations(id uuid PRIMARY KEY, owner_id uuid REFERENCES auth.users, tenant_id uuid REFERENCES auth.users, listing_id uuid REFERENCES public.listings);
    CREATE TABLE public.messages(id int PRIMARY KEY, sender_id uuid REFERENCES auth.users, conversation_id uuid REFERENCES public.conversations, content text);
    CREATE TABLE storage.objects(id int PRIMARY KEY, owner_id text, bucket_id text, name text);
    GRANT USAGE ON SCHEMA public, auth, storage TO service_role, authenticated, anon;
    GRANT ALL ON ALL TABLES IN SCHEMA public, auth, storage TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, storage TO authenticated;
  `);
  for (const table of ["profiles", "listings", "listing_images", "listing_universities", "favorites", "conversations", "messages", "storage.objects"]) {
    await db.exec(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; CREATE POLICY fixture_access ON ${table} FOR ALL TO authenticated USING (true) WITH CHECK (true);`);
  }
  await db.exec(readFileSync(new URL("../docs/account-deletion-setup.sql", import.meta.url), "utf8"));
  await db.exec(`
    INSERT INTO auth.users VALUES ('${A}'),('${B}'),('${C}');
    INSERT INTO profiles VALUES ('${A}','a'),('${B}','b'),('${C}','c');
    INSERT INTO listings VALUES ('${L1}','${A}'),('${L2}','${B}'),('${L3}','${C}');
    INSERT INTO listing_images VALUES (1,'${L1}','${A}/${L1}/one.jpg'),(2,'${L2}','${B}/${L2}/two.jpg');
    INSERT INTO listing_universities VALUES ('${L1}',1),('${L2}',1);
    INSERT INTO favorites VALUES (1,'${A}','${L2}'),(2,'${B}','${L1}'),(3,'${C}','${L3}');
    INSERT INTO conversations VALUES ('${C1}','${A}','${B}','${L1}'),('${C2}','${B}','${A}','${L2}'),('${C3}','${C}','${B}','${L3}');
    INSERT INTO messages VALUES (1,'${A}','${C1}','one'),(2,'${B}','${C1}','two'),(3,'${A}','${C2}','three'),(4,'${B}','${C3}','keep');
    INSERT INTO storage.objects VALUES (1,'${A}','listing-images','${A}/${L1}/one.jpg'),(2,'${B}','listing-images','${B}/${L2}/two.jpg');
  `);
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${A}',false);`);
  await assert.rejects(db.query(`SELECT public.prepare_account_deletion('${B}')`), /permission denied/);
  await assert.rejects(db.query(`SELECT public.purge_account_data('${B}')`), /permission denied/);
  await db.exec(`RESET ROLE; INSERT INTO storage.objects VALUES (8,'${A}','other-bucket','legacy.jpg'); SET ROLE service_role;`);
  await assert.rejects(db.query(`SELECT public.prepare_account_deletion('${A}')`), /Unexpected owned storage/);
  assert.equal((await db.query("SELECT count(*)::int n FROM account_deletion_requests")).rows[0].n, 0);
  await db.exec(`DELETE FROM storage.objects WHERE id=8; INSERT INTO storage.objects VALUES (8,'${B}','listing-images','${A}/conflict.jpg');`);
  await assert.rejects(db.query(`SELECT public.prepare_account_deletion('${A}')`), /Conflicting storage ownership/);
  await db.exec("DELETE FROM storage.objects WHERE id=8;");
  await db.exec(`RESET ROLE; SET ROLE service_role; SELECT public.prepare_account_deletion('${A}'); RESET ROLE;`);
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${A}',false);`);
  assert.equal((await db.query("SELECT public.account_access_allowed() AS allowed")).rows[0].allowed, false);
  assert.equal((await db.query("SELECT * FROM profiles")).rows.length, 0);
  await assert.rejects(db.query(`INSERT INTO storage.objects VALUES (9,'${A}','listing-images','${A}/new.jpg')`), /row-level security/);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${B}',false);`);
  await assert.rejects(db.query(`INSERT INTO messages VALUES (9,'${B}','${C1}','race')`), /deletion in progress/);
  await assert.rejects(db.query(`INSERT INTO favorites VALUES (9,'${B}','${L1}')`), /deletion in progress/);
  await db.exec("RESET ROLE; SET ROLE service_role;");
  await assert.rejects(db.query(`SELECT public.purge_account_data('${A}')`), /Storage cleanup incomplete/);
  assert.equal((await db.query("SELECT count(*)::int n FROM profiles")).rows[0].n, 3);
  // Simulate successful Storage API deletion in the fixture only.
  await db.exec(`DELETE FROM storage.objects WHERE owner_id='${A}';`);
  // Unknown FK dependency must roll back the whole relational purge.
  await db.exec("RESET ROLE; CREATE TABLE public.fixture_unknown(profile_id uuid REFERENCES profiles); GRANT ALL ON fixture_unknown TO service_role;");
  await db.exec(`INSERT INTO fixture_unknown VALUES ('${A}'); SET ROLE service_role;`);
  await assert.rejects(db.query(`SELECT public.purge_account_data('${A}')`), /foreign key/);
  assert.equal((await db.query("SELECT count(*)::int n FROM messages")).rows[0].n, 4);
  await db.exec("RESET ROLE; DROP TABLE fixture_unknown; SET ROLE service_role;");
  await db.exec(`SELECT public.purge_account_data('${A}'); SELECT public.purge_account_data('${A}');`);
  assert.equal((await db.query("SELECT count(*)::int n FROM profiles")).rows[0].n, 2);
  assert.equal((await db.query("SELECT count(*)::int n FROM listings")).rows[0].n, 2);
  for (const table of ["messages", "conversations", "favorites", "listing_images", "listing_universities", "storage.objects"]) {
    assert.equal((await db.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n, 1, table);
  }
  assert.equal((await db.query(`SELECT content FROM messages`)).rows[0].content, "keep");
  // Simulate the Auth Admin API's final hard deletion; all non-marker FKs restrict.
  await db.exec(`DELETE FROM auth.users WHERE id='${A}'; RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${A}',false);`);
  assert.equal((await db.query("SELECT public.account_access_allowed() AS allowed")).rows[0].allowed, false);
  await assert.rejects(db.query(`INSERT INTO storage.objects VALUES (9,'${A}','listing-images','${A}/new.jpg')`), /row-level security/);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${B}',false);`);
  assert.equal((await db.query("SELECT public.account_access_allowed() AS allowed")).rows[0].allowed, true);
  await db.exec("RESET ROLE;");
  assert.equal((await db.query("SELECT count(*)::int n FROM account_deletion_requests")).rows[0].n, 0);
  assert.equal((await db.query("SELECT count(*)::int n FROM auth.users")).rows[0].n, 2);
  console.log("PASS: SQL permissions, pending/stale-token guards, new-reference blocking, Storage prerequisite, transactional rollback, retry, complete relational deletion, marker cleanup and unrelated-user preservation.");
} finally { await db.close(); }
