import { expect, type APIRequestContext, type Page } from '@playwright/test'
// Imported from the app's own label module rather than retyped as string
// literals. Every one of these selectors had rotted: the login page was
// redesigned into Sign in / Create account tabs, its submit button stopped
// saying "Log in", and the register form lost its confirm-password field --
// and 34 of 42 e2e tests had been failing on that ever since, invisibly,
// because the CI job is `if: false`. Importing the constants means a copy
// change breaks the build instead of silently rotting the suite.
import {
  SEG_SIGN_IN,
  SEG_CREATE_ACCOUNT,
  LABEL_EMAIL_ADDRESS,
  LABEL_PASSWORD,
  LABEL_NAME,
  PAGE_HEADING_POS,
  ARIA_DASHBOARD_DATE,
  LABEL_CASHIER_PIN_ARIA,
  LABEL_OPENING_FLOAT,
  BUTTON_CONTINUE,
} from '../src/lib/textLabels/textLabels'

export { PAGE_HEADING_POS, ARIA_DASHBOARD_DATE }

export const TEST_PIN = '1234'

// These e2e tests run against a real Supabase project (see .env / .env.example)
// rather than mock data. Whether the project currently requires email
// confirmation on signup (Auth settings → "Confirm email") is not
// something to assume either way here — it's been toggled before, and
// registerFreshStore() below handles both outcomes. Prefer
// createTestStoreAccount()/loginAsFreshStore() (further down) for any
// test that just needs a working store and doesn't care how it was
// created — those go through the Admin API with email_confirm forced on,
// sidestepping this entirely and, as a bonus, not touching Supabase's
// signup-email rate limit (very easy to exhaust once a suite has more
// than a couple of self-registering tests).

export function uniqueEmail(prefix: string) {
  // mailinator.com is a real, well-known disposable-inbox domain built
  // for exactly this — automated test signups. Supabase's signup
  // validation now rejects RFC 2606 reserved TLDs like .test and
  // .invalid outright (email_address_invalid), and example.com the same
  // way, so those "obviously fake" choices no longer work here even
  // though "Confirm email" is off and nothing is ever actually read
  // from the inbox.
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@mailinator.com`
}

export const TEST_PASSWORD = 'testpass123'

/**
 * Registers through the real public /register form. Returns which of the
 * two valid outcomes actually happened, since that depends on the
 * project's current "Confirm email" setting, not on this test:
 * - 'confirmed': landed straight on /pos (confirmation off).
 * - 'awaiting-confirmation': shown the "check your email" screen.
 */
export async function registerFreshStore(
  page: Page,
  opts?: { storeName?: string; ownerName?: string }
): Promise<{ email: string; outcome: 'confirmed' | 'awaiting-confirmation' }> {
  const email = uniqueEmail('e2e')
  await page.goto('/register')
  await page.getByLabel('Store name').fill(opts?.storeName ?? 'E2E Test Store')
  await page.getByLabel('Your name').fill(opts?.ownerName ?? 'Test Admin')
  await page.getByLabel(LABEL_EMAIL_ADDRESS).fill(email)
  await page.getByLabel(LABEL_PASSWORD, { exact: true }).fill(TEST_PASSWORD)
  // No confirm-password field: the register form does not have one.
  //
  // The submit button is disabled until the terms checkbox is ticked
  // (canSubmit = !submitting && agreedToTerms). That consent step was added
  // after this suite was written, and without it the click just times out
  // against a permanently disabled button.
  await page.getByRole('checkbox', {
    name: 'I agree to the Terms of Service and Privacy Policy',
  }).click()

  await page.getByRole('button', { name: SEG_CREATE_ACCOUNT }).click()

  // A store registered through the real form has onboarded_at unset, so
  // ProtectedRoute sends it to the onboarding wizard -- not to the register.
  // (createTestStoreAccount stamps onboarded_at precisely to skip this; this
  // helper deliberately does not, because it is testing the real signup.)
  await expect(
    page
      .getByRole('heading', { name: 'Check your email' })
      .or(page.locator('body').filter({ hasText: /Let.s get your shop ready to sell/i }))
  ).toBeVisible({ timeout: 15_000 })

  const outcome = (await page.getByRole('heading', { name: 'Check your email' }).count()) > 0
    ? 'awaiting-confirmation'
    : 'confirmed'
  return { email, outcome }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
// Server-side only (not VITE_-prefixed) — used exclusively from Node via
// Playwright's `request` fixture, never sent to the browser/client.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const canCreateTestAccountsDirectly = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)

/**
 * Creates a fresh store account directly via the Supabase Admin Users API
 * (service_role) instead of the public /register form. Same end state —
 * the `handle_new_user` trigger (migration 0001) still fires and creates
 * the store + admin staff row — but skips the public signup endpoint's
 * email-send rate limit entirely, since admin-created users send no
 * confirmation email at all.
 *
 * Use this (or loginAsFreshStore below) for any test that just needs an
 * isolated store to work in. Reserve registerFreshStore() above for tests
 * that are specifically exercising the public registration form itself —
 * this bypasses that form completely.
 */
export async function createTestStoreAccount(
  request: APIRequestContext,
  opts?: { storeName?: string; ownerName?: string }
): Promise<{ email: string; password: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'createTestStoreAccount requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set.'
    )
  }
  const email = uniqueEmail('e2e-admin-api')
  const res = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    data: {
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        store_name: opts?.storeName ?? 'E2E Test Store',
        owner_name: opts?.ownerName ?? 'Test Admin',
      },
    },
  })
  if (!res.ok()) {
    throw new Error(`createTestStoreAccount failed: ${res.status()} ${await res.text()}`)
  }

  // Mark the store as having finished the onboarding wizard.
  //
  // ProtectedRoute sends any admin with onboarded_at = null to /onboarding, and
  // handle_new_user() creates every staff row with it unset -- so without this
  // a freshly-created account lands on the wizard, not the POS. That wizard was
  // added after this suite was written, and it is why 24 tests were failing on
  // `expect(page).toHaveURL(/\/pos/)`.
  //
  // Stamped here rather than clicked through, because these tests are about
  // what a WORKING store can do. Onboarding has its own coverage; making every
  // other spec walk a four-step wizard first would be slow and would couple
  // them all to its markup.
  const { id } = (await res.json()) as { id: string }
  const patch = await request.patch(`${SUPABASE_URL}/rest/v1/staff?id=eq.${id}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    data: { onboarded_at: new Date().toISOString() },
  })
  if (!patch.ok()) {
    throw new Error(
      `createTestStoreAccount could not complete onboarding: ${patch.status()} ${await patch.text()}`
    )
  }

  return { email, password: TEST_PASSWORD }
}

/** Creates a fresh store account (fast path, see above) and logs into it. */
export async function loginAsFreshStore(
  request: APIRequestContext,
  page: Page,
  opts?: { storeName?: string; ownerName?: string }
): Promise<string> {
  const { email, password } = await createTestStoreAccount(request, opts)
  await login(page, email, password)
  return email
}

export async function login(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto('/login')
  const emailInput = page.getByLabel('Email address')
  const passwordInput = page.getByLabel('Password', { exact: true })
  await emailInput.fill(email)
  await passwordInput.fill(password)
  // A DOM value check (toHaveValue) confirms the input's raw value, but
  // these are React-controlled inputs — the browser applies fill()'s
  // value immediately, while React's own state commit (which is what the
  // submit handler's closure actually reads) can lag behind under CPU
  // load, e.g. a busier CI runner. Waiting a tick for React's scheduler
  // to catch up avoids submitting the form with a stale (empty) email/
  // password captured in the handler, seen as a "missing email or
  // phone" alert despite the field visibly having a value.
  // Generous timeout: on a slow/congested CI runner, this whole file's
  // other steps (nav, DB round-trips) have been observed taking 2x their
  // normal time in the same run — 5s default margin isn't always enough
  // headroom purely from infrastructure variance, independent of any
  // actual app or test bug.
  await expect(emailInput).toHaveValue(email, { timeout: 15_000 })
  await expect(passwordInput).toHaveValue(password, { timeout: 15_000 })
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: SEG_SIGN_IN }).click()
  await expect(page).toHaveURL(/\/pos/, { timeout: 15_000 })
}

export async function addProduct(
  page: Page,
  product: {
    name: string
    category: string
    price: string
    stock: string
    barcode?: string
    lowStockThreshold?: string
  }
) {
  await page.goto('/inventory')
  await page.getByRole('button', { name: 'Add product' }).click()
  await page.getByLabel(LABEL_NAME, { exact: true }).fill(product.name)
  if (product.barcode) {
    await page.getByLabel('Barcode', { exact: true }).fill(product.barcode)
  }

  // Category is a dropdown of existing per-store categories (plus a
  // "+ New category…" option), not free text — pick the existing option
  // if there is one, otherwise create it inline the way an admin would.
  const categorySelect = page.getByLabel('Category', { exact: true })
  const hasCategory = await categorySelect.locator('option', { hasText: product.category }).count()
  if (hasCategory > 0) {
    await categorySelect.selectOption({ label: product.category })
  } else {
    await categorySelect.selectOption({ label: '+ New category…' })
    await page.getByPlaceholder('New category name').fill(product.category)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
  }

  await page.getByLabel('Price').fill(product.price)
  await page.getByLabel('Stock', { exact: true }).fill(product.stock)
  if (product.lowStockThreshold) {
    await page.getByLabel('Low-stock at').fill(product.lowStockThreshold)
  }
  await page.locator('form').getByRole('button', { name: 'Add product' }).click()
  await expect(page.getByRole('row', { name: product.name })).toBeVisible({ timeout: 10_000 })
}

/**
 * Open the register.
 *
 * /pos does not show the checkout screen directly any more — it shows the
 * cashier picker, and getting past it needs a staff member with a PIN. That
 * gate was added after this suite was written and is why every POS test was
 * timing out on the search control: the page they were driving was the picker,
 * not the register.
 *
 * The PIN is set through set_own_pin() with the account's own token rather
 * than by writing pin_hash directly, because the hash is produced by crypt()
 * inside that function — reproducing it here would encode an implementation
 * detail of how PINs are stored into the test suite.
 */
export async function primeCashierPin(request: APIRequestContext, email: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('primeCashierPin requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  const auth = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password: TEST_PASSWORD },
  })
  if (!auth.ok()) throw new Error(`primeCashierPin sign-in failed: ${await auth.text()}`)
  const { access_token: token } = (await auth.json()) as { access_token: string }

  const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/set_own_pin`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: { p_pin: TEST_PIN },
  })
  if (!res.ok()) throw new Error(`set_own_pin failed: ${res.status()} ${await res.text()}`)
}

/** Pick the staff member on the cashier picker and unlock the register. */
export async function startCashierSession(page: Page, staffName = 'Test Admin') {
  await page.goto('/pos')
  await page.getByRole('button', { name: new RegExp(staffName) }).first().click()

  // The order here was established by walking the flow in a browser, after
  // guessing it wrong twice: starting cash comes BEFORE the PIN, not after.
  //
  //   pick staff -> count starting cash -> Continue -> PIN keypad -> register
  //
  // Both middle steps are conditional (a cashier without a PIN skips the
  // keypad; a register already open skips the float), so each is attempted
  // only if it actually appears.

  const float = page.getByLabel(LABEL_OPENING_FLOAT)
  await float.waitFor({ timeout: 10_000 }).catch(() => {})
  if (await float.isVisible().catch(() => false)) {
    await float.fill('0')
    await page.getByRole('button', { name: BUTTON_CONTINUE }).click()
  }

  // A keypad, not a text field: LABEL_CASHIER_PIN_ARIA labels a
  // <div role="status"> holding the dots, so fill() has nothing to fill.
  const firstKey = page.getByRole('button', { name: '1', exact: true })
  await firstKey.waitFor({ timeout: 10_000 }).catch(() => {})
  if (await firstKey.isVisible().catch(() => false)) {
    for (const digit of TEST_PIN) {
      await page.getByRole('button', { name: digit, exact: true }).click()
    }
  }

  await expect(page.getByRole('heading', { name: PAGE_HEADING_POS })).toBeVisible({
    timeout: 15_000,
  })
}
