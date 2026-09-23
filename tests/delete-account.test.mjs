import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const helperSource = readFileSync(new URL("../app/lib/server/deleteAccount.js", import.meta.url), "utf8")
  .replace('import "server-only";', "").replace("export async function", "async function");
const deleteAccount = new Function(`${helperSource}\nreturn deleteAccount;`)();
const routeSource = readFileSync(new URL("../app/api/account/delete/route.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");

function storageFixture(failStep) {
  const calls = [];
  const objects = new Set(Array.from({ length: 205 }, (_, i) => `${userId}/listing/image-${String(i).padStart(3, "0")}.jpg`));
  objects.add(`${userId}/orphan.jpg`);
  objects.add(`${otherId}/keep.jpg`);
  const admin = {
    rpc: async (name, args) => {
      calls.push(name);
      assert.equal(args.target_user_id, userId);
      return { error: failStep === name ? new Error("internal") : null };
    },
    storage: { from: (bucket) => {
      assert.equal(bucket, "listing-images");
      return {
        list: async (prefix, { offset, limit }) => {
          calls.push("list");
          if (failStep === "list") return { error: new Error("internal") };
          const children = new Map();
          for (const path of objects) {
            if (!path.startsWith(`${prefix}/`)) continue;
            const rest = path.slice(prefix.length + 1), name = rest.split("/")[0];
            children.set(name, { name, id: rest.includes("/") ? null : path });
          }
          return { data: [...children.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(offset, offset + limit) };
        },
        remove: async (paths) => {
          calls.push("remove");
          if (failStep === "remove") return { error: new Error("internal") };
          assert(paths.length <= 100);
          for (const path of paths) { assert(path.startsWith(`${userId}/`)); objects.delete(path); }
          return { data: [] };
        },
      };
    } },
    auth: { admin: { deleteUser: async (id, soft) => {
      calls.push("deleteUser"); assert.equal(id, userId); assert.equal(soft, false);
      return { error: failStep === "deleteUser" ? new Error("internal") : null };
    } } },
  };
  return { admin, calls, objects };
}

test("deletes all paginated/nested/orphan files in owner prefix, then data, then Auth", async () => {
  const f = storageFixture(); await deleteAccount(f.admin, userId);
  assert.deepEqual([...f.objects], [`${otherId}/keep.jpg`]);
  assert.equal(f.calls[0], "prepare_account_deletion");
  assert.deepEqual(f.calls.slice(-2), ["purge_account_data", "deleteUser"]);
});
for (const step of ["prepare_account_deletion", "list", "remove", "purge_account_data", "deleteUser"]) {
  test(`stops without claiming success on ${step} failure`, async () => {
    const f = storageFixture(step);
    await assert.rejects(deleteAccount(f.admin, userId));
    if (step !== "deleteUser") assert(!f.calls.includes("deleteUser"));
    if (["prepare_account_deletion", "list", "remove"].includes(step)) assert(!f.calls.includes("purge_account_data"));
    assert(f.objects.has(`${otherId}/keep.jpg`));
  });
}

function endpoint({ valid = true, configured = true, fail = false } = {}) {
  const deleted = [], tokens = [];
  const env = configured ? { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-fixture", SUPABASE_SERVICE_ROLE_KEY: "private-fixture" } : {};
  const createClient = () => ({ auth: { getUser: async (token) => {
    tokens.push(token); return valid ? { data: { user: { id: userId } } } : { error: new Error("invalid") };
  } } });
  const run = new Function("createClient", "deleteAccount", "process", "Response", `${routeSource}\nreturn POST;`)(
    createClient, async (_, id) => { if (fail) throw new Error("private-fixture"); deleted.push(id); }, { env }, Response,
  );
  return { run, deleted, tokens };
}
function request(body = { confirmation: "delete-account" }, headers = {}) {
  return new Request("https://shaus.test/api/account/delete", { method: "POST", headers: { Authorization: "Bearer valid-token", "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
}
test("requires valid token and deletes only the server-verified account", async () => {
  const f = endpoint(); assert.equal((await f.run(request())).status, 200);
  assert.deepEqual(f.deleted, [userId]); assert.deepEqual(f.tokens, ["valid-token"]);
});
test("rejects supplied victim UUID, unauthenticated and cross-origin requests", async () => {
  const f = endpoint();
  assert.equal((await f.run(request({ confirmation: "delete-account", user_id: otherId }))).status, 400);
  assert.equal((await f.run(request(undefined, { Authorization: "" }))).status, 401);
  assert.equal((await f.run(request(undefined, { Origin: "https://evil.test" }))).status, 403);
  assert.deepEqual(f.deleted, []);
  assert.equal((await endpoint({ valid: false }).run(request())).status, 401);
});
test("missing setup credentials and internal errors never report success or expose secrets", async () => {
  assert.equal((await endpoint({ configured: false }).run(request())).status, 503);
  const response = await endpoint({ fail: true }).run(request());
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert(!(await response.text()).includes("private-fixture"));
});

const uiSource = readFileSync(new URL("../app/components/DeleteAccountSection.js", import.meta.url), "utf8");
function uiFixture(success) {
  const events = [], errors = [], deletingRef = { current: false };
  const fn = uiSource.slice(uiSource.indexOf("  async function confirmDeletion"), uiSource.indexOf("\n  return ("));
  const run = new Function("deletingRef", "setDeleting", "setError", "supabase", "fetch", "window", `${fn}\nreturn confirmDeletion;`)(
    deletingRef, () => {}, (value) => errors.push(value),
    { auth: { getSession: async () => ({ data: { session: { access_token: "fixture-token" } } }), signOut: async (options) => { assert.equal(options.scope, "local"); events.push("signOut"); return {}; } } },
    async (url, options) => { events.push("request"); assert.equal(url, "/api/account/delete"); assert.deepEqual(JSON.parse(options.body), { confirmation: "delete-account" }); return { ok: success, json: async () => success ? { success: true } : { error: "Incomplete deletion" } }; },
    { location: { replace: (path) => { assert.equal(path, "/"); events.push("home"); } } },
  );
  return { run, events, errors };
}
test("successful UI confirmation signs out locally and redirects home", async () => {
  const f = uiFixture(true); await f.run();
  assert.deepEqual(f.events, ["request", "signOut", "home"]);
});
test("failed UI confirmation shows an error without sign-out or redirect", async () => {
  const f = uiFixture(false); await f.run();
  assert.deepEqual(f.events, ["request"]); assert(f.errors.includes("Incomplete deletion"));
});
test("cancel only closes the dialog and cannot close during a deletion", () => {
  const fn = uiSource.slice(uiSource.indexOf("  function close()"), uiSource.indexOf("  async function confirmDeletion"));
  let closes = 0;
  const ref = { current: false };
  const close = new Function("deletingRef", "dialogRef", `${fn}\nreturn close;`)(ref, { current: { close: () => closes++ } });
  close(); assert.equal(closes, 1);
  ref.current = true; close(); assert.equal(closes, 1);
});
