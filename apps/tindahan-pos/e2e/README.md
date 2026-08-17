# End-to-end tests

## State of this suite, honestly

**It is largely broken, and has been for a while.** Measured on a clean local
run: **15 of 41 tests pass** — up from 8 when this was first pointed at a
local stack, and from 11 at the end of the first repair pass.

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

- **Ambiguous label selectors.** The inventory search box carries
  `aria-label="Search by name, category, or barcode"`, and `getByLabel` matches
  substrings — so `getByLabel('Name')`, `('Category')` and `(/Barcode/)` each
  resolved to *two* elements and Playwright refused in strict mode. Not renamed
  fields, as it first appeared: ambiguous selectors. Now exact-matched.
- **`role="cell"` assertions.** The product list renders rows whose children
  are `<p>`, not table cells, so `getByRole('cell')` matched nothing while the
  row carries the accessible name. Now `getByRole('row')`.
- **The admin dashboard has no heading at all** — its title is a time-based
  greeting in a `<p>`. Tests now key off the reporting-date picker's
  `aria-label`, which is a stable, semantic landmark.

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

| count | spec | cause |
|---|---|---|
| 9 | `pos-checkout` | **the cashier-session gate** — see below |
| 7 | `reports` | downstream of the same gate / dashboard landmarks |
| 5 | `feature-flags` | adds products then drives the POS, so the same gate |
| 2 | `login`, 2 `security`, 1 `performance` | assorted |

**The cashier-session gate is the one blocker worth understanding.** `/pos`
no longer shows the register — it shows a cashier picker, and getting past it
needs a staff member with a PIN, entered on a *keypad* (the aria-label is on a
`<div role="status">` showing dots, so `fill()` has nothing to fill). That
gate was added after this suite was written, and it is why every POS test
timed out looking for a search control: the page they were driving was the
picker.

`primeCashierPin()` and `startCashierSession()` in `helpers.ts` are the
beginnings of a fix — the PIN is set through `set_own_pin()` with the
account's own token, and the digits are pressed rather than filled. **They do
not work yet.** The keypad renders and the digits are pressed, but the session
does not open; the failure is somewhere in `start_cashier_session`, past the
point I traced. Anyone picking this up should start there, not at the
selectors.

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
