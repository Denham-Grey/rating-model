# Verification checklist

Status of each item from the migration's verification requirements. The
first four were run for real against the live project during this work,
using a disposable second admin account (created and fully deleted
afterward — never the real `admin@admin.com` account).

## 1. Second test user via `create-user`, role `analyst`

**Verified.** `supabase/verify/verify.mjs` signs in as an admin, calls the
`create-user` Edge Function, and confirms it returns a working account. Ran
successfully against the live project; the test account was deleted after.

## 2. IDOR test — analyst cannot read another user's assessment by ID, via the client SDK, under their own session

**Verified**, and it caught a real bug on the first run: `infinite
recursion detected in policy for relation "profiles"`. The pre-existing
`admins read all profiles` policy checked admin-ness with a subquery against
`profiles` from within a policy defined on `profiles` itself — evaluating it
re-triggers the same policy. This wasn't introduced by this work; it was
latent in the schema as supplied and had apparently never been exercised
end-to-end before. Fixed in
`supabase/migrations/20260729173000_fix_profiles_rls_recursion.sql` by
moving the check into a `SECURITY DEFINER` helper function
(`public.is_admin()` / `public.user_is_admin(uuid)`), which is the standard
fix for this class of bug — same access-control outcome, no more recursion.
The same fix was needed for the `configs` "read admin configs" policy added
in this work, which had the equivalent bug (an RLS-gated cross-table lookup
that would have silently returned nothing for non-admin callers).

After the fix: analyst's `.from('assessments').select('*').eq('id', targetId)`
correctly returns no row for an assessment it doesn't own.

A second, unrelated relationship bug turned up later while building the
React frontend: `assessments.owner_id` and `profiles.id` both reference
`auth.users(id)` independently, so there is **no direct foreign key between
`assessments` and `profiles`** for PostgREST to embed across. Any query using
`profiles!assessments_owner_id_fkey(...)` as an embedded resource fails with
`PGRST200`. The frontend resolves owner display names with a separate
`profiles` lookup instead (see `rating-model/src/hooks/useAssessments.ts`).
Not a security issue — RLS was correctly blocking the query either way —
but worth knowing if this join is attempted again anywhere.

## 3. Admin can read that same assessment

**Verified**, same run — admin's client-SDK query for the same row returns
it.

## 4. Last-admin-lockout trigger blocks demoting the sole admin

**Verified**, via a `BEGIN … ROLLBACK` transaction so nothing persisted:
temporarily demoted every admin except the test admin (within the
transaction), then attempted to demote the test admin too. The trigger
raised `Cannot change this account's role: it is the last remaining admin.`
and aborted the transaction; the rollback restored everything, confirmed
afterward by re-querying `profiles` (the real admin's row was untouched
throughout — it was never the one being demoted).

`verify.mjs` also runs this check automatically, but only when exactly one
admin exists in the project at run time (it refuses to attempt a destructive
demote against a project with more than one admin, and it never targets the
account whose credentials you supplied unless that account genuinely is the
sole admin).

## 5. No `service_role` key ever appears in a browser network request

**Verified statically**, which is stronger than a runtime capture for this
question. Run this against the production build:

```bash
cd rating-model
npm run build
grep -rc "service_role" dist/   # expect 0 in every file
grep -rc "sb_secret_" dist/     # expect 0, or only a benign hit inside
                                 # supabase-js's own key-format classifier
                                 # (a literal prefix string the library uses
                                 # to detect key types — not a real key)
```

The only place `service_role` is referenced anywhere in this codebase is
`supabase/functions/_shared/admin_guard.ts`, and there only as
`Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` — read from the Edge Function's
own server-side environment at request time, never a literal key, never
returned in any response body.

Also confirmed live in a real browser (Playwright) during smoke-testing:
the sign-in flow's only Supabase network call was
`POST /auth/v1/token?grant_type=password`, carrying the anon key. To confirm
the same for `create-user` specifically, with real admin credentials in
hand: open the admin console, open DevTools → Network, click "Create
account", and inspect the request to `/functions/v1/create-user` — the
`Authorization` header carries the signed-in admin's own JWT (decode at
jwt.io: `"role":"authenticated"`), never a `"role":"service_role"` token.

---

## Running `verify.mjs` yourself

```bash
cd supabase/verify
npm install
SUPABASE_URL=https://gvqnlhyligtoxlaxnmzr.supabase.co \
SUPABASE_ANON_KEY=<anon key> \
ADMIN_EMAIL=admin@admin.com \
ADMIN_PASSWORD=<the real admin password> \
npm run verify
```

Never commit real credentials — pass them as env vars each run. The script
creates and does **not** delete its own test analyst account (so you can
inspect it afterward); re-run cleanup manually via the Supabase dashboard's
Auth panel if you want it gone, or ask for a cleanup script.
