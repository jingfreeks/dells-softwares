import { expect, test } from '@playwright/test'

test.describe('Login (stories D1-D3)', () => {
  test('unauthenticated visitor is redirected to login', async ({ page }) => {
    await page.goto('/inventory')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows a clear error for incorrect credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email or phone').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpass')
    await page.getByRole('button', { name: 'Log in' }).click()

    await expect(page.getByRole('alert')).toHaveText(/incorrect email or password/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('logs in with valid demo credentials and lands on POS', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email or phone').fill('admin@dellsstore.ph')
    await page.getByLabel('Password').fill('admin123')
    await page.getByRole('button', { name: 'Log in' }).click()

    await expect(page).toHaveURL(/\/pos/)
    await expect(page.getByRole('heading', { name: 'POS Checkout' })).toBeVisible()
  })

  test('forgot-password link is reachable and shows a confirmation', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(/\/forgot-password/)

    await page.getByLabel('Email or phone').fill('admin@dellsstore.ph')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByRole('status')).toContainText('admin@dellsstore.ph')
  })
})

test.describe('Registration (story D1)', () => {
  test('creates a store and logs the new admin straight in', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Store name').fill("Aling Nena's Store")
    await page.getByLabel('Your name').fill('Nena Reyes')
    await page.getByLabel('Email or phone number').fill('nena@example.com')
    await page.getByLabel('Password', { exact: true }).fill('secret123')
    await page.getByLabel('Confirm password').fill('secret123')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL(/\/pos/)
  })

  test('rejects mismatched passwords', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Store name').fill("Aling Nena's Store")
    await page.getByLabel('Your name').fill('Nena Reyes')
    await page.getByLabel('Email or phone number').fill('nena@example.com')
    await page.getByLabel('Password', { exact: true }).fill('secret123')
    await page.getByLabel('Confirm password').fill('different')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByRole('alert')).toHaveText(/do not match/i)
    await expect(page).toHaveURL(/\/register/)
  })
})
