# End-to-end tests

## State of this suite, honestly

**Measured on a clean local run: 24 of 37 tests pass** — up from 8 when this
was first pointed at a local stack, then 11, 15, 18. `login` and the report
export are fully green; POS checkout went from 0 to 6.

(37, not 41: `reports` had seven tests for a PDF feature the app no longer
has. They are three tests against the Excel export that replaced it.)

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
- **The PDF report feature is gone.** `reports.spec.ts` covered a combined
  PDF, per-card exports, print-to-tab and a Web Share fallback. There is no
  `as PDF` / `Print report` / `Share report` label left in the app and no PDF
  library in `src/`; the dashboard now offers one action, *Export dashboard
  report as Excel*. Seven tests for a removed feature became three against
  the one that replaced it — including a check that the file really is a
  workbook (ExcelJS writes a ZIP, so it must start `PK`) rather than an empty
  blob from a failed build.
- **Registration needs the terms checkbox.** `canSubmit = !submitting &&
  agreedToTerms`, so *Create account* is disabled until it is ticked and the
  click simply timed out against it.
- **A new store lands on `/onboarding`,** not the register — `handle_new_user`
  leaves `onboarded_at` unset. `registerFreshStore()` exercises the real
  signup and now expects that; `createTestStoreAccount()` stamps it for every
  test that just wants a working store.
- **"Lands on POS" is the route, not the register.** `/pos` shows the cashier
  picker until a session is started, so the login spec asserts the URL and the
  picker rather than the register heading.

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

| count | spec |
|---|---|
| 5 | `feature-flags` |
| 5 | `pos-checkout` |
| 2 | `security` |
| 1 | `performance` |

All of the same class — the UI moved and the tests did not follow — but now
against a suite that reaches the app's main screens, so each is cheap to
diagnose. Drive the flow in a browser before theorising; see below.

**The cashier-session flow — solved, and worth writing down.** `/pos` does not
show the register directly. The real sequence, established by walking it in a
browser after guessing it wrong twice:

    pick staff  ->  count starting cash  ->  Continue  ->  PIN keypad  ->  register

Both middle steps are conditional, and **the starting cash comes before the
PIN**, not after — which is what defeated two earlier attempts. The PIN is a
keypad, not a text field: `LABEL_CASHIER_PIN_ARIA` labels a
`<div role="status">` holding the dots, so `fill()` has nothing to fill; the
digits must be pressed. `startCashierSession()` in `helpers.ts` does all of
this, and `primeCashierPin()` sets the PIN through `set_own_pin()` with the
account's own token rather than writing `pin_hash` directly.

**The POS search box was also unified.** There used to be a scan/search mode
toggle; there is now a single field ("Scan barcode or search products"), so
the `'Search by name'` button the specs clicked no longer exists.

## Re-enabling in CI

Needs a `workflow`-scoped token, so it is not done here. Once the failures
above are addressed, delete the `if: false` from the `e2e` job in
`.github/workflows/tindahan-pos-ci.yml` and give it a local stack the way
`platform-ci.yml` already does for pgTAP — `supabase/setup-cli@v1` then
`supabase start`, with `VITE_SUPABASE_URL` and the two keys read from
`supabase status`. No hosted project, no secrets, no rate limit.
