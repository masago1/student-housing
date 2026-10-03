// Integration tests for the real add/edit routes, shared view and persistence handlers.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const temporary = createRequire(join(process.argv[2], "package.json"));
const { build } = temporary("esbuild");
const { JSDOM } = temporary("jsdom");
const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { url: "https://shaus.example/editeaza-proprietate/listing-1" });
globalThis.window = dom.window; globalThis.document = window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};
URL.createObjectURL = () => "blob:new-image"; URL.revokeObjectURL = () => {};
const React = require("react"), { act } = React;
const { createRoot } = require("react-dom/client");
const user = { id: "owner", email: "owner@example.test" };
const listing = { id: "listing-1", user_id: "owner", title: "Titlu existent", city: "Timișoara", neighborhood_id: 10,
  property_type: "apartment", listing_type: "room", address: "Adresă de test", latitude: 45.7, longitude: 21.2,
  price_monthly: 450, rooms: 2, bedrooms: 1, bathrooms: 1, surface_m2: 55, furnished: true, available_from: "2099-06-01",
  description: "Descriere existentă", floor: 0, total_floors: 4, construction_year: 2000, heating_type: "central",
  air_conditioning: true, balcony: true, parking: false, pets_allowed: true, smoking_allowed: false, max_tenants: 2,
  deposit_amount: 0, utilities_included: true, image_url: "cover.jpg" };
const cities = [{ id: 1, name: "Timișoara", slug: "timisoara" }, { id: 2, name: "Cluj-Napoca", slug: "cluj-napoca" }];
const rows = { profiles: [{ id: "owner", nickname: "owner", phone: "0700000000" }], listings: [listing], cities,
  neighborhoods: [{ id: 10, name: "Centru", city_id: 1 }, { id: 20, name: "Mărăști", city_id: 2 }],
  universities: [{ id: 1, name: "Universitate de test", short_name: "UT", city: "Timișoara" }],
  listing_universities: [{ listing_id: listing.id, university_id: 1 }],
  listing_images: [{ id: "other", listing_id: listing.id, image_url: "other.jpg", storage_path: "owner/other" },
    { id: "cover", listing_id: listing.id, image_url: "cover.jpg", storage_path: "owner/cover" }] };
let errorTable = "", authUser = user, operations = [], storageOperations = [];
const router = { push() {}, replace() {}, refresh() {} };
globalThis.formTestRouter = router;
globalThis.formTestDatabase = {
  auth: { getUser: async () => ({ data: { user: authUser } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({}) },
  storage: { from: () => ({
    upload: async (path) => { storageOperations.push(["upload", path]); return { error: null }; },
    getPublicUrl: path => ({ data: { publicUrl: `https://images.example.test/${path}` } }),
    remove: async paths => { storageOperations.push(["remove", paths]); return { error: null }; },
  }) },
  from(table) {
    let data = [...(rows[table] || [])], op = "select", payload, single = false, conditions = [];
    const query = { select: () => query, order: () => query,
      eq(key, value) { conditions.push([key, value]); data = data.filter(item => item[key] === value); return query; },
      in(key, values) { conditions.push([key, values]); data = data.filter(item => values.includes(item[key])); return query; },
      maybeSingle() { single = true; return query; }, single() { single = true; return query; },
      update(value) { op = "update"; payload = value; return query; },
      insert(value) { op = "insert"; payload = value; return query; },
      delete() { op = "delete"; return query; },
      then(resolve, reject) {
        operations.push({ table, op, payload, conditions });
        const result = op === "insert" && table === "listings" ? { id: "new-listing" } : single ? data[0] || null : data;
        return Promise.resolve({ data: result, error: errorTable === table ? { message: "Fixture read failure" } : null }).then(resolve, reject);
      } };
    return query;
  },
};
globalThis.fetch = async url => ({ ok: true, json: async () => String(url).includes("suggest")
  ? { suggestions: [{ mapbox_id: "address-fixture", name: "Adresă nouă", place_formatted: "Timișoara" }] }
  : String(url).includes("retrieve") ? { features: [{ geometry: { coordinates: [21.3, 45.8] }, properties: { full_address: "Adresă nouă, Timișoara", name: "Adresă nouă", place_formatted: "Timișoara" } }] }
  : { latitude: 45.7, longitude: 21.2 } });
async function bundle(file, name) {
  const output = join(process.argv[2], `listing-form-${name}.cjs`);
  await build({ entryPoints: [fileURLToPath(new URL(file, import.meta.url))], outfile: output, bundle: true,
    platform: "node", format: "cjs", jsx: "automatic", loader: { ".js": "jsx" }, define: { "process.env.NEXT_PUBLIC_MAPBOX_TOKEN": '"fixture-token"' }, plugins: [{ name: "fixtures", setup(builder) {
      builder.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, args => ({ path: require.resolve(args.path), external: true }));
      builder.onResolve({ filter: /(?:next\/navigation|lib\/supabase)$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("supabase")
        ? "export const supabase = globalThis.formTestDatabase;"
        : "export const useRouter = () => globalThis.formTestRouter; export const useParams = () => ({id:'listing-1'});" }));
    } }] });
  return require(output).default;
}
const Add = await bundle("../app/adaugaproprietate/page.js", "add");
const Edit = await bundle("../app/editeaza-proprietate/[id]/page.js", "edit");
const root = createRoot(document.getElementById("root")); let generation = 0;
async function render(Component) { await act(async () => { root.render(React.createElement(Component, { key: ++generation })); }); }
const field = name => document.querySelector(`[name="${name}"]`);
const submitButton = () => document.querySelector('button[type="submit"]');
const mutations = () => operations.filter(item => item.op !== "select");
const structure = () => ({ names: [...document.querySelectorAll("[name]")].map(el => el.name),
  sections: [...document.querySelectorAll("h2,h3")].map(el => el.textContent.trim()),
  labels: [...document.querySelectorAll("label")].filter(el => !el.querySelector("input[type=file]")).map(el => el.textContent.trim()),
  inputStyles: [...document.querySelectorAll("[name]")].map(el => el.getAttribute("style")) });
async function submit() { await act(async () => document.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }))); }
async function change(el, value) {
  await act(async () => {
    const proto = el.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new window.Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}

await render(Edit);
assert.equal(document.querySelector("h1").textContent.trim(), "Editează anunțul");
assert.equal(submitButton().textContent.trim(), "Salvează modificările");
assert.equal(field("address").placeholder, "Strada și numărul");
for (const name of ["title", "property_type", "listing_type", "neighborhood_id", "address", "price_monthly", "rooms", "bedrooms", "bathrooms", "surface_m2", "furnished", "description", "floor", "total_floors", "construction_year", "air_conditioning", "balcony", "parking", "pets_allowed", "smoking_allowed", "max_tenants", "deposit_amount", "utilities_included"]) {
  assert.equal(field(name).value, String(listing[name]), `Prefill ${name}`);
}
assert(document.body.textContent.includes("01/06/2099"));
assert(document.querySelector('input[type="checkbox"]').checked);
assert.deepEqual([...document.querySelectorAll("img")].map(img => img.getAttribute("src")), ["cover.jpg", "other.jpg"]);
assert.equal(mutations().length, 0, "Opening edit never writes data");
const editStructure = structure();
operations = []; storageOperations = [];
await submit();
const updates = mutations().filter(item => item.table === "listings");
assert.equal(updates.length, 2);
for (const update of updates) {
  assert.equal(update.op, "update");
  assert.deepEqual(update.conditions, [["id", "listing-1"], ["user_id", "owner"]]);
}
assert.equal(updates[0].payload.listing_type, "room");
assert.equal(updates[0].payload.description, listing.description);
assert.equal(updates[0].payload.floor, 0); assert.equal(updates[0].payload.deposit_amount, 0);
assert.equal(updates[0].payload.heating_type, "central", "Legacy heating value preserved");
assert.equal(updates[1].payload.image_url, "cover.jpg");
assert(!mutations().some(item => item.op === "insert" || item.op === "delete"), "Unchanged images/universities are neither replaced nor deleted");
assert.equal(storageOperations.length, 0);

await render(Edit); operations = []; storageOperations = [];
await change(field("address"), "Adresă nouă");
await submit();
assert.equal(mutations().length, 0, "Editing address requires a fresh confirmed location");
await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)); });
const suggestion = [...document.querySelectorAll("button")].find(button => button.textContent.includes("Adresă nouă"));
assert(suggestion, "Edit autocomplete suggestions are visible in the shared form");
await act(async () => suggestion.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true, cancelable: true })));
assert.equal(field("address").value, "Adresă nouă, Timișoara");
await submit();
assert.equal(mutations().find(item => item.table === "listings").payload.latitude, 45.8);

await render(Edit); operations = []; storageOperations = [];
const editUpload = document.querySelector('input[type="file"]');
Object.defineProperty(editUpload, "files", { configurable: true, value: [new window.File(["fixture"], "extra.jpg", { type: "image/jpeg" })] });
await act(async () => editUpload.dispatchEvent(new window.Event("change", { bubbles: true })));
await submit();
assert.equal(storageOperations.filter(([op]) => op === "upload").length, 1);
assert(!mutations().some(item => item.op === "delete"));
assert.equal(mutations().find(item => item.op === "insert" && item.table === "listing_images").payload[0].listing_id, "listing-1");
assert.equal(mutations().find(item => item.payload?.image_url).payload.image_url, "cover.jpg", "Adding images preserves the current cover");

await render(Edit); operations = []; storageOperations = [];
await act(async () => [...document.querySelectorAll("button")].find(button => button.textContent.trim() === "×").click());
assert.equal(mutations().length, 0, "Removing a preview waits for Save");
await submit();
assert.deepEqual(mutations().find(item => item.table === "listing_images" && item.op === "delete").conditions,
  [["id", ["cover"]], ["listing_id", "listing-1"]]);
assert.equal(mutations().find(item => item.payload?.image_url).payload.image_url, "other.jpg");
assert.deepEqual(storageOperations, [["remove", ["owner/cover"]]]);

for (const table of ["listing_images", "listing_universities"]) {
  errorTable = table;
  await render(Edit); operations = [];
  assert(submitButton().disabled); await submit(); assert.equal(mutations().length, 0);
}
errorTable = ""; listing.user_id = "someone-else";
await render(Edit); operations = [];
assert(submitButton().disabled); await submit(); assert.equal(mutations().length, 0);
listing.user_id = "owner";

await render(Add);
assert.equal(document.querySelector("h1").textContent.trim(), "Adaugă anunțul");
// Select the same city so both university/zone controls expose the same catalogue.
await change([...document.querySelectorAll("select")].find(el => [...el.options].some(option => option.textContent.trim() === "Timișoara")), "Timișoara");
const addStructure = structure();
assert.deepEqual(addStructure, editStructure, "Add/edit share sections, field order, labels and input styling");
operations = []; await submit();
assert(document.body.textContent.includes("Completează titlul anunțului."));
assert.equal(mutations().length, 0);
for (const [name, value] of Object.entries({ title: "Anunț de test", neighborhood_id: "10", address: "Adresă de test", price_monthly: "400", rooms: "2", surface_m2: "50" })) await change(field(name), value);
const fileInput = document.querySelector('input[type="file"]');
Object.defineProperty(fileInput, "files", { configurable: true, value: [new window.File(["fixture"], "fixture.jpg", { type: "image/jpeg" })] });
await act(async () => fileInput.dispatchEvent(new window.Event("change", { bubbles: true })));
await submit();
assert.equal(mutations().filter(item => item.table === "listings" && item.op === "insert").length, 1, "Add still creates a new listing");
assert.equal(mutations().find(item => item.table === "listings" && item.op === "insert").payload[0].listing_type, "rent", "Default add behavior preserved");
await act(async () => root.unmount());
console.log("Add/edit integration passed: shared UI, prefill, cover/all images preserved, owner-scoped update, explicit removal, failed-load save guards, add creation and validation.");
