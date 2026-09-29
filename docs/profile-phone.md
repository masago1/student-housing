# International profile phone numbers

## Supabase SQL to run

The live phone index and profile triggers are not defined in this repository, and
no live database connection was available. No SQL has been executed on Supabase.

1. Run **profile-phone-inspection.sql** first. It returns the existing indexes,
   constraints, trigger definitions/functions and phone column type, without
   reading private profile rows. Share/review these results before migration.
2. Review **profile-phone-setup.sql** against those definitions, then execute the
   complete transaction in the SQL Editor before deploying the profile change.
   If an existing trigger already enforces phone immutability, retain it and omit
   the additional `guard_profile_phone_once`/`profile_phone_once` installation.
   Check that it prevents clearing/replacing a saved phone and that normal clients
   cannot bypass it by deleting/recreating their profile. The supplied guard permits
   the existing service-role account-deletion flow.
3. If an existing legacy `07…` check or immutable-phone trigger prevents the data
   conversion, the transaction fails and rolls back. Inspect its actual definition
   before adapting the migration; do not disable unrelated profile protections.

The migration converts the previously supported Romanian `07…` representation
and formatted international/`00…` values to E.164. It stops for ambiguous legacy
values or normalized duplicates; it never deletes profiles or chooses an owner.
Review any existing international data with the library before migration because
the SQL format constraint verifies E.164 structure, not every country's numbering
plan. The library performs country-specific validity checks for new input.

The script reuses a valid single-column unique phone index/constraint, including
one excluding NULLs. It adds one only when none is recognized. Existing triggers,
RLS and other constraints remain in place. An E.164 format check rejects local or
formatted writes; the unique index prevents competing profiles claiming the same
canonical value; the trigger prevents replacing or clearing an existing phone.

The authenticated `profile_phone_taken` RPC checks only the supplied E.164 value,
excludes `auth.uid()` and returns only a boolean. It works with owner-only profile
RLS without exposing other profiles. The atomic unique index remains authoritative
if availability changes between checking and saving. Both preflight and write
conflicts show **Acest număr de telefon este asociat altui cont.** inline.

## Application behavior

- The selector lists the countries supported by `libphonenumber-js`, with Romanian
  country names, flags and calling codes. Romania is the default: selector
  `🇷🇴 +40`, placeholder `7XX XXX XXX`, combined example `+40 7XX XXX XXX`.
- The field contains the national part. A valid pasted `+…`/`00…` number selects
  its country and removes the calling code from the field. National input is
  formatted on blur to avoid moving the cursor during editing.
- Parsing uses the library's full (`max`) metadata. It preserves significant
  Italian leading zeroes and accepts country-specific mobile and fixed-line
  numbers. Extensions and non-geographic calling codes are outside this country's
  selector and are rejected. Formatting follows the library metadata, so Serbia
  may display `6X XXXXXXX` rather than manually grouping `6X XXX XXXX`.
- Only E.164 is used for the duplicate RPC and new profile writes. Existing saved
  phones are omitted from subsequent profile writes, remain visible and read-only,
  and have a disabled country selector. The notice appears only before saving.
- If another tab saved a phone first, the fresh profile read preserves it. The
  database immutability error also reloads/locks the saved number after a race.
- The existing listing validator retains legacy Romanian support and also accepts
  valid saved E.164 numbers, so the profile change does not block listing creation.
  No listing UI, signup, login, email or username validation was changed.

## Verification

Run `node --test --test-isolation=none tests/profile-phone.test.mjs` for parsing,
formatting, own-number handling, E.164 writes, duplicate and immutable-write fallbacks.
The production build was checked using a placeholder Supabase URL/key; its sitemap
lookup could not fetch real listings. This is compilation verification, not a live
Supabase integration test.

`tests/profile-phone-sql.mjs` accepts a temporary installation's PGlite
`dist/index.js` path. It runs the migration against in-memory PostgreSQL with
synthetic data, checks existing-index reuse, reruns, duplicate rejection,
immutability, anonymous denial, service-role deletion, own-number exclusion, and
rollback on legacy collisions. Its competing writes exercise the unique index
through one database instance, not a multi-connection Supabase load test.

Before production deployment, verify the inspected live schema and test two
accounts claiming one number, two tabs setting different numbers on one account,
international country selection, mobile layout, unchanged saved-phone display,
and other profile fields saving after the phone has been locked.

Library reference: [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js).
