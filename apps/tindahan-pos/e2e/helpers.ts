import { expect, type Page } from '@playwright/test'

// These e2e tests run against a real Supabase project (see .env / .env.example)
// rather than mock data, so each test registers its own fresh store instead of
// relying on seeded demo data. The target project must have "Confirm email"
// disabled in Auth settings for registration to land the user straight on
// /pos (see supabase/migrations/0001_init.sql header for the full setup).

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

export const TEST_PASSWORD = 'testpass123'

export async function registerFreshStore(page: Page, opts?: { storeName?: string; ownerName?: string }) {
  const email = uniqueEmail('e2e')
  await page.goto('/register')
  await page.getByLabel('Store name').fill(opts?.storeName ?? 'E2E Test Store')
  await page.getByLabel('Your name').fill(opts?.ownerName ?? 'Test Admin')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
  await page.getByLabel('Confirm password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/pos/, { timeout: 15_000 })
  return email
}

export async function login(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
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
  await page.getByLabel('Category').fill(product.category)
  await page.getByLabel('Price').fill(product.price)
  await page.getByLabel('Stock', { exact: true }).fill(product.stock)
  if (product.lowStockThreshold) {
    await page.getByLabel('Low-stock at').fill(product.lowStockThreshold)
  }
  await page.locator('form').getByRole('button', { name: 'Add product' }).click()
  await expect(page.getByRole('cell', { name: product.name })).toBeVisible({ timeout: 10_000 })
}
