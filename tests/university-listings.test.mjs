import test from 'node:test';
import assert from 'node:assert/strict';
import { universityListingIds } from '../app/lib/universityListings.mjs';

function database({ links = [{ listing_id: 'a', university_id: 'u' }, { listing_id: 'a', university_id: 'u' }, { listing_id: 'b', university_id: 'other' }], failure } = {}) {
  const rows = { cities: [{ id: 'c', name: 'Timișoara', slug: 'timisoara' }],
    universities: [{ id: 'u', short_name: 'UMFT', name: 'University', city: 'TIMIȘOARA' },
      { id: 'other', short_name: 'Other', city: 'București' }], listing_universities: links };
  return { from(table) {
    let data = rows[table];
    const query = { select() { return query; }, eq(key, value) { data = data.filter(row => row[key] === value); return query; },
      then(resolve, reject) { return Promise.resolve({ data, error: table === failure ? new Error('Database unavailable') : null }).then(resolve, reject); } };
    return query;
  } };
}
test('city-only results do not query university associations', async () => {
  assert.equal(await universityListingIds({ from() { throw new Error('Unexpected query'); } }, 'timisoara', ''), null);
});
test('university results preserve city matching, IDs, aliases and deduplicated association IDs', async () => {
  for (const university of ['umft', 'UMFT', 'University', 'u']) {
    assert.deepEqual(await universityListingIds(database(), 'TIMIȘOARA', university), ['a']);
  }
});
test('empty universities stay empty and unknown or wrong-city universities never broaden results', async () => {
  assert.deepEqual(await universityListingIds(database({ links: [] }), 'timisoara', 'umft'), []);
  for (const value of ['unknown', 'other']) await assert.rejects(universityListingIds(database(), 'timisoara', value));
});
test('lookup and association errors propagate rather than falling back to city-wide results', async () => {
  for (const failure of ['cities', 'universities', 'listing_universities']) {
    await assert.rejects(universityListingIds(database({ failure }), 'timisoara', 'umft'), /Database unavailable/);
  }
});
