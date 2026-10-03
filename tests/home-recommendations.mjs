// DOM integration checks using the existing temporary esbuild/jsdom dependencies.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const temporary = createRequire(join(process.argv[2], "package.json"));
const { build } = temporary("esbuild");
const { JSDOM } = temporary("jsdom");
const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { url: "https://shaus.example/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = require("react");
const { act } = React;
const { createRoot } = require("react-dom/client");
const cities = [{ id: "t", name: "Timișoara", slug: "timisoara" }, { id: "c", name: "Cluj-Napoca", slug: "cluj-napoca" }];
let openPreferences = 0, locationCalls = 0, databaseError = false;
globalThis.recommendationConsent = { externalServices: false, openPreferences: () => openPreferences++ };
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { geolocation: { getCurrentPosition: () => locationCalls++ } } });
const rows = Array.from({ length: 8 }, (_, i) => ({ id: String(i), title: `Locuință ${i}`, city: i % 2 ? "Timișoara" : "Cluj-Napoca",
  price_monthly: 450, rooms: 2, surface_m2: 55, property_type: "apartment", active: true, created_at: `2026-10-0${8 - i}`,
  image_url: "https://example.test/image.jpg" }));
globalThis.recommendationDatabase = { from() {
  const query = { select: () => query, eq: () => query, order: () => query, range: () => query, abortSignal: () => query,
    then: resolve => Promise.resolve({ data: rows, error: databaseError ? new Error("Offline") : null }).then(resolve) };
  return query;
} };
const output = join(process.argv[2], "home-recommendations.cjs");
await build({ entryPoints: [fileURLToPath(new URL("../app/components/HomeRecommendations.js", import.meta.url))], outfile: output,
  bundle: true, platform: "node", format: "cjs", jsx: "automatic", loader: { ".js": "jsx" },
  define: { "process.env.NEXT_PUBLIC_MAPBOX_TOKEN": '"test"' },
  plugins: [{ name: "fixtures", setup(builder) {
    builder.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, args => ({ path: require.resolve(args.path), external: true }));
    builder.onResolve({ filter: /(?:lib\/supabase|ConsentProvider|FavoriteButton|ListingImageGallery|next\/link|\.module\.css)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
      args.path.endsWith("supabase") ? 'export const supabase = globalThis.recommendationDatabase;'
        : args.path.endsWith("ConsentProvider") ? 'export const useConsent = () => globalThis.recommendationConsent;'
        : args.path.endsWith("FavoriteButton") ? 'import React from "react"; export default ({listingId}) => React.createElement("button", {"data-favorite":listingId}, "Favorite");'
        : args.path.endsWith("ListingImageGallery") ? 'import React from "react"; export default ({children,listingId}) => React.createElement("button", {"data-gallery":listingId}, children);'
        : args.path === "next/link" ? 'import React from "react"; export default ({children,...props}) => React.createElement("a",props,children);'
        : 'export default new Proxy({}, { get: (_,key) => key });' }));
  } }],
});
const Recommendations = require(output).default;
const root = createRoot(document.getElementById("root"));
let generation = 0;
const render = async () => act(async () => root.render(React.createElement(Recommendations, { cities, key: ++generation })));
const click = async text => act(async () => [...document.querySelectorAll("button")].find(button => button.textContent === text).click());
await render();
assert.equal(document.querySelector("h2").textContent, "Chirii din toată România");
assert.equal(document.querySelectorAll("article").length, 6);
assert.equal(document.querySelectorAll("[data-favorite]").length, 6);
assert.equal(document.querySelectorAll("[data-gallery]").length, 6);
assert.equal(document.querySelector(".cta").getAttribute("href"), "/proprietate/0");
assert.equal(locationCalls, 0, "Mount must never request location");
await click("Folosește locația mea");
assert.equal(openPreferences, 1); assert.equal(locationCalls, 0);
window.localStorage.setItem("shaus-recent-search", JSON.stringify({ version: 1, city: "timisoara", savedAt: Date.now(), filters: { rooms: "2" } }));
await render();
assert.equal(document.querySelector("h2").textContent, "Chirii din toată România");
assert.equal(document.querySelector(".cta").getAttribute("href"), "/proprietate/1");
await click("Resetează recomandările");
assert.equal(document.querySelector("h2").textContent, "Chirii din toată România");
assert.equal(window.localStorage.getItem("shaus-recent-search"), null);
databaseError = true;
await render();
assert.match(document.querySelector('[role="status"]').textContent, /nu au putut fi încărcate/);
databaseError = false;
await click("Încearcă din nou");
assert.equal(document.querySelectorAll("article").length, 6);
await act(async () => root.unmount());
console.log("Homepage recommendations DOM checks passed: six cards, ranking, links, favorites/gallery controls, consent gate, reset and retry.");
