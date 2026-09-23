import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const publicFiles = [
  'app/proprietate/[id]/page.js',
  'app/chirii/[city]/CityListingsClient.js',
  'app/chirii/[city]/MobileCityListingsClient.js',
  'app/chirii/[city]/[university]/page.js',
  'app/sitemap.js',
];
const stageA = read('docs/public-listings-stage-a.sql');
const stageB = read('docs/public-listings-stage-b.sql');

test('all six public listing reads use explicit safe-view projections', () => {
  let total = 0;
  for (const path of publicFiles) {
    const source = read(path);
    assert(!/\.from\(\s*"listings"/.test(source), path);
    const queries = [...source.matchAll(/\.from\("public_listings"\)\s*\.select\(\s*(["`])([\s\S]*?)\1\s*\)/g)];
    assert(queries.length > 0, path);
    for (const query of queries) assert(!query[2].includes('*'), path);
    total += queries.length;
  }
  assert.equal(total, 6);
});

test('public detail selects every field it uses and the SQL allowlist supplies it', () => {
  const source = read(publicFiles[0]);
  const projection = source.match(/\.from\("public_listings"\)\s*\.select\(`([\s\S]*?)`\)/)[1];
  const fields = projection.split(',').map(x => x.trim());
  const used = [...new Set([...source.matchAll(/listing\.(\w+)/g)].map(x => x[1]))];
  assert.deepEqual(fields.slice().sort(), used.sort());
  for (const field of fields) assert(stageA.includes(`l.${field}`), field);
  assert(!fields.includes('owner_email'));
});

test('dashboard shared reads preserve aliases; owner reads and writes retain base table', () => {
  const dashboard = read('app/dashboard/page.js');
  assert.equal((dashboard.match(/listings:shared_listing_summaries \(/g) || []).length, 2);
  assert(!/\n\s+listings \(/.test(dashboard));
  assert.equal((dashboard.match(/\.from\("listings"\)/g) || []).length, 3);
  const edit = read('app/editeaza-proprietate/[id]/page.js');
  assert(/\.from\(\s*"listings"\s*\)\s*\.select\(\s*"\*"/.test(edit));
  assert(edit.includes('listingData.latitude') && edit.includes('listingData.longitude'));
  assert(!edit.includes('public_listings'));
  assert(!read('app/adaugaproprietate/page.js').includes('public_listings'));
});

test('proposed SQL projects only rounded public coordinates and no shared coordinates', () => {
  const publicSelect = stageA.split('FROM public.listings AS l')[0];
  for (const axis of ['latitude', 'longitude']) {
    assert(publicSelect.includes(`round(l.${axis}::numeric / 0.005) * 0.005 AS ${axis}`));
    assert.equal((publicSelect.match(new RegExp(`l\\.${axis}`, 'g')) || []).length, 1);
  }
  assert(stageA.includes('WHERE l.active IS TRUE'));
  const shared = stageA.split('CREATE VIEW public.shared_listing_summaries')[1];
  assert(!/latitude|longitude|owner_phone|owner_email/.test(shared));
  assert(shared.includes('f.user_id = auth.uid()'));
  assert(shared.includes('c.tenant_id = auth.uid() OR c.owner_id = auth.uid()'));
  assert(shared.includes('public.account_deletion_requests'));
  assert(!stageA.includes('GRANT ALL'));
});

test('proposed base boundary cannot be OR-ed away by permissive public policies', () => {
  assert(stageB.includes('AS RESTRICTIVE FOR SELECT TO authenticated'));
  assert(stageB.includes('AS RESTRICTIVE FOR SELECT TO anon\nUSING (false)'));
  assert(stageB.includes('REVOKE SELECT ON public.listings FROM PUBLIC, anon'));
  assert(stageB.includes('REVOKE SELECT (%s)'));
  assert(!/DROP POLICY|FOR UPDATE|FOR INSERT|FOR DELETE/.test(stageB));
});
