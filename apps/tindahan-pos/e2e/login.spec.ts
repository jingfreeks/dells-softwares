import { expect, test } from '@playwright/test'
import {
  canCreateTestAccountsDirectly,
  createTestStoreAccount,
  registerFreshStore,
  login,
  uniqueEmail,
  TEST_PASSWORD,
} from './helpers'
import { PAGE_HEADING_POS } from './helpers'
import { SEG_SIGN_IN, LABEL_CASHIER_PICKER_HEADING } from '../src/lib/textLabels/textLabels'

test.describe('Login (stories D1-D3)', () => {
  test('unauthenticated visitor is redirected to login', async ({ page }) => {
    await page.goto('/inventory')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows a clear error for incorrect credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email address').fill(uniqueEmail('nobody'))
    await page.getByLabel('Password', { exact: true }).fill('wrongpass')
    await page.getByRole('button', { name: SEG_SIGN_IN }).click()

    await expect(page.getByRole('alert')).toHaveText(/incorrect email or password/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('logs in with valid credentials and lands on POS', async ({ page, request }) => {
    test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')
    const { email, password } = await createTestStoreAccount(request)

    await login(page, email, password)
    // "Lands on POS" is about login, not about opening the register: /pos
    // shows the cashier picker until a session is started. Asserting the
    // register heading here would be testing startCashierSession(), which
    // pos-checkout.spec.ts already covers.
    await expect(page).toHaveURL(/\/pos/)
    await expect(page.getByText(LABEL_CASHIER_PICKER_HEADING)).toBeVisible()
  })

  test('forgot-password link is reachable and shows a confirmation', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(/\/forgot-password/)

    const email = uniqueEmail('reset')
    const emailInput = page.getByLabel('Email address')
    await emailInput.fill(email)
    // toHaveValue confirms the DOM's raw value, but this is a
    // React-controlled input — the submit handler's closure reads
    // React's own committed state, which can still lag behind that DOM
    // value under CI CPU load. Confirmed via the login() helper hitting
    // the same class of bug (a "missing email" alert despite the field
    // visibly being filled) — an explicit tick after the DOM value
    // check gives React's scheduler a chance to actually catch up.
    // Generous timeout: a congested CI runner has been observed running
    // this whole suite ~2x slower end to end, independent of any app bug.
    await expect(emailInput).toHaveValue(email, { timeout: 15_000 })
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByRole('status')).toContainText(email)
  })
})

test.describe('Registration (story D1)', () => {
  test('creates a store, landing on POS or an email-confirmation screen', async ({ page }) => {
    // Which of the two happens depends on the project's current "Confirm
    // email" Auth setting, not on this test — registerFreshStore()
    // reports whichever one actually occurred so this doesn't hard-fail
    // just because that setting changed since the test was written.
    const { email, outcome } = await registerFreshStore(page)
    if (outcome === 'confirmed') {
      // A brand-new store lands on the onboarding wizard, not the register:
      // handle_new_user leaves onboarded_at unset and ProtectedRoute redirects
      // on it. Tests that want a working store use createTestStoreAccount(),
      // which stamps it; this one is exercising the real signup, so it sees
      // what a real new customer sees.
      await expect(page).toHaveURL(/\/onboarding/)
    } else {
      await expect(page.getByRole('status')).toContainText(email)
    }
  })

  // A 'rejects mismatched passwords' test lived here. The register form has
  // no confirm-password field any more, so it asserted behaviour the product
  // does not have -- it was not a regression to fix but a test to retire.
  // Password rules that DO still exist (minLength 8, required) are enforced
  // by the browser and covered by the unit suite.
})
