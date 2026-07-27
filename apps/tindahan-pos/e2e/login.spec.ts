import { expect, test } from '@playwright/test'
import {
  canCreateTestAccountsDirectly,
  createTestStoreAccount,
  registerFreshStore,
  login,
  uniqueEmail,
  TEST_PASSWORD,
} from './helpers'

test.describe('Login (stories D1-D3)', () => {
  test('unauthenticated visitor is redirected to login', async ({ page }) => {
    await page.goto('/inventory')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows a clear error for incorrect credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email address').fill(uniqueEmail('nobody'))
    await page.getByLabel('Password', { exact: true }).fill('wrongpass')
    await page.getByRole('button', { name: 'Log in' }).click()

    await expect(page.getByRole('alert')).toHaveText(/incorrect email or password/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('logs in with valid credentials and lands on POS', async ({ page, request }) => {
    test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')
    const { email, password } = await createTestStoreAccount(request)

    await login(page, email, password)
    await expect(page.getByRole('heading', { name: 'POS Checkout' })).toBeVisible()
  })

  test('forgot-password link is reachable and shows a confirmation', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(/\/forgot-password/)

    const email = uniqueEmail('reset')
    await page.getByLabel('Email address').fill(email)
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
      await expect(page).toHaveURL(/\/pos/)
    } else {
      await expect(page.getByRole('status')).toContainText(email)
    }
  })

  test('rejects mismatched passwords', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Store name').fill("Aling Nena's Store")
    await page.getByLabel('Your name').fill('Nena Reyes')
    await page.getByLabel('Email address').fill(uniqueEmail('nena'))
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
    await page.getByLabel('Confirm password').fill('different')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByRole('alert')).toHaveText(/do not match/i)
    await expect(page).toHaveURL(/\/register/)
  })
})
