import { expect, type APIRequestContext, type Page } from '@playwright/test'

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
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
  await page.getByLabel('Confirm password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(
    page.getByRole('heading', { name: 'POS Checkout' }).or(page.getByRole('heading', { name: 'Check your email' }))
  ).toBeVisible({ timeout: 15_000 })

  const outcome = (await page.getByRole('heading', { name: 'Check your email' }).count()) > 0
    ? 'awaiting-confirmation'
    : 'confirmed'
  return { email, outcome }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
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
  await expect(emailInput).toHaveValue(email)
  await expect(passwordInput).toHaveValue(password)
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: 'Log in' }).click()
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
  await page.getByLabel('Name').fill(product.name)
  if (product.barcode) {
    await page.getByLabel(/Barcode/).fill(product.barcode)
  }

  // Category is a dropdown of existing per-store categories (plus a
  // "+ New category…" option), not free text — pick the existing option
  // if there is one, otherwise create it inline the way an admin would.
  const categorySelect = page.getByLabel('Category')
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
  await expect(page.getByRole('cell', { name: product.name })).toBeVisible({ timeout: 10_000 })
}
