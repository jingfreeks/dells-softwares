# End-to-end tests

## State of this suite

**41 of 41 pass** on a clean local stack.

That is worth stating against where it started: **8 of 42** the first time it
was pointed at a local database. The suite had been rotting invisibly for as
long as the CI job has been `if: false`
(`.github/workflows/tindahan-pos-ci.yml`) and the pre-push hook has skipped
e2e — a suite that never runs cannot report that it has stopped working.

Progression: 8 → 11 → 15 → 18 → 24 → 29 → 36 → **41**.

Almost every failure was the app moving and the tests not following. **Three
were real bugs**, and they are the argument for having done this at all:

1. **`anon` could not read `feature_flags`** — `20260815101000` granted it
   nothing on the reasoning that nothing is queried before sign-in. But
   `FeatureFlagsProvider` is mounted *outside* `AuthProvider` and runs on
   mount, so pre-login flags 401'd in any fresh environment. Fixed in
   `20260815107000`, covered by `220_anon_surface`.
2. **Deep-linking to `/staff` or `/suppliers` bounced an authorised owner to
   `/pos`** — `useCan()` returns false while permissions load, and both pages
   redirected on it without waiting. A refresh or a pasted link was enough.
   Fixed in both pages.
3. **A real account and password were committed** in `performance.spec.ts`
   (`StagingTest123!`). It now provisions its own account per run.

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
- **The POS search box is one field for both jobs.** A barcode is submitted
  with **Enter** — there is no 'Add' button — and there is no separate
  'No-barcode quick items' tab; an item without a barcode is just an item.
- **The field clears on submit, not on clicking a result.**
  `handleProductQuerySubmit` calls `setProductQuery("")` after adding, while
  clicking a result keeps the query so several matches can be added in a row.
  Worth knowing before "fixing" a test that asserts clearing.
- **`+10 stock` moved into the row's actions menu** (`More actions`), as a
  `role="menuitem"`. It is no longer a button on the row itself.
- **Two `Admin` links exist** — sidebar and bottom nav — so `getByRole` needs
  disambiguating, and the "Sale recorded" toast covers the bottom one just
  after checkout.
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

## Notes for whoever touches this next


**Drive the flow in a browser before theorising.** Two rounds of reading
components produced confident wrong answers about the cashier-session order;
one round of actually clicking through settled it. Reading tells you what
elements exist, not which ones render when.

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
