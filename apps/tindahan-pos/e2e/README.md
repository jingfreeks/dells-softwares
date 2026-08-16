# End-to-end tests

## State of this suite, honestly

**It is largely broken, and has been for a while.** Measured on a clean local
run: **11 of 41 tests pass.**

That is not a regression introduced here — it is what was already true and
nobody could see, because the CI job is `if: false`
(`.github/workflows/tindahan-pos-ci.yml`) and the pre-push hook skips e2e on
purpose. A suite that never runs cannot tell you it has stopped working.

Every failure is the same class: **the app's UI moved and the tests did not
follow.** None of them so far indicates an actual product bug.

## Running it locally

Previously these tests ran against a **shared hosted Supabase project** — they
created real users on every run, depended on that project's Auth settings
(which "have been toggled before"), and could exhaust its signup rate limit.
That is why CI disabled them, and the workflow says as much: re-enable "once
e2e gets its own dedicated Supabase project".

A local stack is that dedicated project — free, isolated, and thrown away
after each run. This became possible only after `20260815101000`, which added
the table grants a database built purely from migrations was missing.

```bash
cd apps/tindahan-pos
supabase start
supabase db reset --local

# The anon key and URL the app reads:
cat > .env.local <<EOF
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=$(supabase status -o json | jq -r .ANON_KEY)
EOF

SUPABASE_SERVICE_ROLE_KEY="$(supabase status -o json | jq -r .SERVICE_ROLE_KEY)" \
  npx playwright test
```

A full run takes about nine minutes, mostly in timeouts from the failures
below. `.env.local` is gitignored; never point these at a hosted project again.

## What has been fixed

- **Selectors now import the app's own label constants** rather than repeating
  string literals. The login page was redesigned into `Sign in` /
  `Create account` tabs and its submit button stopped saying "Log in" — 62 of
  the waits in a failing run were for that one dead string. Importing
  `SEG_SIGN_IN` and friends means the next copy change breaks the *build*
  instead of silently rotting the suite.
- **The onboarding redirect.** `ProtectedRoute` sends any admin with
  `onboarded_at = null` to `/onboarding`, and every freshly-created test store
  has it unset — so 24 tests were failing `expect(page).toHaveURL(/\/pos/)`.
  `createTestStoreAccount()` now stamps it, because these specs are about what
  a working store can do; onboarding has its own coverage.
- **A register test asserting a field that no longer exists** (confirm
  password) was retired rather than repaired.

## What is still broken, and why

| count | waiting for | cause |
|---|---|---|
| 14 | `getByLabel('Name')` | the product form's field was renamed |
| 7 | `heading 'Admin dashboard'` | **no such heading exists in the app** — `PAGE_HEADING_ADMIN_DASHBOARD` is defined in `textLabels.ts` and rendered by nothing |
| 4 | `button 'Services'` | a POS tab that was renamed or removed |
| 2 | `heading 'POS Checkout'` | same |
| 3 | assorted | a redirect assertion, a `Create account` button |

Two of these need a decision rather than a fix:

- **Headings are not headings.** Eleven pages render their title as
  `<p className="tpl-h1">`, only two as `<h1>`. `getByRole('heading')` finds
  nothing on those pages. Fixing the tests means selecting on text instead —
  fixing the *app* means semantic headings, which is also an accessibility
  improvement and a larger change. The tests should not be bent around this
  until someone decides which.
- **`PAGE_HEADING_ADMIN_DASHBOARD` and `LABEL_LOG_IN` are dead constants.**
  Neither is rendered anywhere. They should either be used or deleted; leaving
  them is what let the tests keep believing in UI that no longer exists.

## Re-enabling in CI

Needs a `workflow`-scoped token, so it is not done here. Once the failures
above are addressed, delete the `if: false` from the `e2e` job in
`.github/workflows/tindahan-pos-ci.yml` and give it a local stack the way
`platform-ci.yml` already does for pgTAP — `supabase/setup-cli@v1` then
`supabase start`, with `VITE_SUPABASE_URL` and the two keys read from
`supabase status`. No hosted project, no secrets, no rate limit.
