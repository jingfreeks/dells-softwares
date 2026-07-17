import { expect, test, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email or phone').fill('admin@dellsstore.ph')
  await page.getByLabel('Password').fill('admin123')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/pos/)
}

test.describe('POS checkout flow (Epic A)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('unknown barcode shows "Product not found" (story A1)', async ({ page }) => {
    await page.getByPlaceholder('Scan or type a barcode, then press Enter').fill('0000000000000')
    await page.getByRole('button', { name: 'Add' }).click()

    await expect(page.getByRole('alert')).toHaveText(/product not found/i)
  })

  test('adding a product by search shows it in the cart with the right total (stories A2, A5)', async ({
    page,
  }) => {
    await page.getByPlaceholder('e.g. sardines').fill('sardines')
    await page.getByRole('button', { name: /Sardines in Tomato Sauce/ }).click()

    await expect(page.getByLabel('Cart items').getByText('Sardines in Tomato Sauce')).toBeVisible()
    await expect(page.getByTestId('cart-total')).toHaveText('₱22.00')

    await page.getByLabel('Amount tendered').fill('50')
    await expect(page.getByText('₱28.00')).toBeVisible()
  })

  test('quantity can be adjusted without rescanning (story A3)', async ({ page }) => {
    await page.getByPlaceholder('e.g. sardines').fill('sardines')
    await page.getByRole('button', { name: /Sardines in Tomato Sauce/ }).click()

    await page.getByRole('button', { name: /Increase quantity/ }).click()
    await expect(page.getByTestId('cart-total')).toHaveText('₱44.00')
  })

  test('a no-barcode quick item (tingi) can be added directly (story A4)', async ({ page }) => {
    await page.getByRole('button', { name: /Shampoo Sachet \(Tingi\)/ }).click()
    await expect(page.getByLabel('Cart items').getByText('Shampoo Sachet (Tingi)')).toBeVisible()
  })

  test('an item can be removed before checkout (story A7)', async ({ page }) => {
    await page.getByPlaceholder('e.g. sardines').fill('sardines')
    await page.getByRole('button', { name: /Sardines in Tomato Sauce/ }).click()
    await page.getByRole('button', { name: /Remove Sardines/ }).click()

    await expect(page.getByText('Cart is empty')).toBeVisible()
  })

  test('completing a sale clears the cart and records it on the dashboard (story A6, C5)', async ({
    page,
  }) => {
    await page.getByPlaceholder('e.g. sardines').fill('sardines')
    await page.getByRole('button', { name: /Sardines in Tomato Sauce/ }).click()
    await page.getByLabel('Amount tendered').fill('50')
    await page.getByRole('button', { name: 'Complete sale' }).click()

    await expect(page.getByText('Sale recorded')).toBeVisible()
    await expect(page.getByText('Cart is empty')).toBeVisible()

    await page.getByRole('link', { name: 'Admin' }).click()
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.getByText('₱22.00').first()).toBeVisible()
  })

  test('the Complete sale button is disabled without sufficient payment', async ({ page }) => {
    await page.getByPlaceholder('e.g. sardines').fill('sardines')
    await page.getByRole('button', { name: /Sardines in Tomato Sauce/ }).click()
    await page.getByLabel('Amount tendered').fill('5')

    await expect(page.getByRole('button', { name: 'Complete sale' })).toBeDisabled()
  })
})

test.describe('Inventory (Epic B)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.getByRole('link', { name: 'Inventory' }).click()
  })

  test('flags low and out-of-stock products (story B5)', async ({ page }) => {
    await expect(page.getByRole('alert')).toContainText('running low or out of stock')
  })

  test('a new product can be added and appears in the table (story B1)', async ({ page }) => {
    await page.getByRole('button', { name: 'Add product' }).click()
    await page.getByLabel('Name').fill('Instant Noodles')
    await page.getByLabel('Category').fill('Canned Goods')
    await page.getByLabel('Price').fill('15')
    await page.getByLabel('Stock', { exact: true }).fill('40')
    await page.locator('form').getByRole('button', { name: 'Add product' }).click()

    await expect(page.getByRole('cell', { name: 'Instant Noodles' })).toBeVisible()
  })

  test('restocking increases the stock count (story B4)', async ({ page }) => {
    const row = page.getByRole('row', { name: /Ube Crackers/ })
    await row.getByRole('button', { name: '+10 stock' }).click()
    await expect(row.getByRole('cell', { name: '18' })).toBeVisible()
  })
})
