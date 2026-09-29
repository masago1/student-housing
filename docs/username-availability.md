# Signup username availability

The signup field is stored as `profiles.nickname`. Its existing validation allows
3–30 ASCII letters, digits, dots, underscores and hyphens. Signup now queries the
existing `public_profiles` view after 300 ms without changes, using exact equality
(`eq`) with case preserved. Underscores are literal characters. `David`, `DAVID`
and `david` are distinct usernames. Invalid or empty inputs do not query. Stale
responses are discarded when the field changes, signup starts or the form closes.
The duplicate message clears when editing and appears directly below the field.
Taken names block both the submit button and the submit handler. The existing
fresh submission check still runs before `auth.signUp`, including after a failed
background lookup; failed lookups never count as available at submission.

## Database verification and deployment

No live Supabase credentials or complete schema are present in this workspace.
Live grants, indexes and auth triggers have therefore not been verified or changed.
The reported live index is `profiles_nickname_unique` on `lower(nickname)`.
Run `username-uniqueness.sql` in the Supabase SQL editor to replace it with a normal
unique index on `nickname`. The transaction also removes
`profiles_nickname_lower_unique` if the earlier proposed script was applied, so it
cannot continue rejecting case variants. Failure rolls back the replacement;
no profile values are modified. Exact equality requires the existing nickname
column to be text/varchar with a deterministic collation, rather than `citext` or
a case-insensitive collation. The live column type has not been verified here.
Confirm anonymous users can read existing nicknames through `public_profiles`.

Profile-write SQLSTATE `23505` shows the same inline duplicate message. Signup
errors also recheck availability because Auth may obscure a trigger's uniqueness
error. Login, recovery, authentication options and profile creation timing remain
unchanged.

The existing flow writes a profile after signup when a session is returned, or
on first login when email confirmation is required. Without an existing database
trigger reserving nicknames during Auth signup, the profile unique index prevents
duplicate profiles but cannot prevent two Auth accounts from being created before
either profile is written. Verify the live signup trigger before claiming atomic
nickname reservation at account creation; adding that behavior would change the
authentication lifecycle and is outside this frontend addition.

Verify in a connected browser: with only `David` stored, `David` is taken while
`DAVID` and `david` are available; underscores match literally. Also test
rapid edits, paste/autofill, failed requests, and concurrent registrations. An
existing nickname must show the exact red message, clear on editing, and block
submission. Check login and recovery still behave as before.
