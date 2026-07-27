import { expect, test, type Page } from '@playwright/test'
import { login } from './helpers'

// Speed check for the app's key screens and interactions, against a real
// Supabase project (not mocked) so the numbers reflect actual network
// round-trips. Thresholds are intentionally generous — this isn't a strict
// CI gate, it's meant to catch a genuine regression (a page that used to
// load in under a second suddenly taking five) without flaking on normal
// network jitter to Supabase.
//
// Uses the existing staging demo account (already seeded with a realistic
// product catalog) rather than self-registering a fresh store per run:
// Supabase's public signup endpoint is rate-limited, and "how fast is the
// app for someone who already has an account" is the realistic thing to
// measure anyway — nobody re-registers between every screen. Set
// PERF_TEST_EMAIL / PERF_TEST_PASSWORD to point this at a different
// account; otherwise it falls back to the staging demo login.

const TEST_EMAIL = process.env.PERF_TEST_EMAIL ?? 'lyndell.dobluis@gmail.com'
const TEST_PASSWORD = process.env.PERF_TEST_PASSWORD ?? 'StagingTest123!'

interface NavTiming {
  domContentLoaded: number
  firstContentfulPaint: number | null
}

async function measureNav(page: Page, url: string): Promise<NavTiming> {
  await page.goto(url)
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const fcp = performance
      .getEntriesByType('paint')
      .find((e) => e.name === 'first-contentful-paint')
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      firstContentfulPaint: fcp ? Math.round(fcp.startTime) : null,
    }
  })
}

async function timeAction(action: () => Promise<void>): Promise<number> {
  const start = Date.now()
  await action()
  return Date.now() - start
}

const results: Record<string, number | string> = {}

test.describe.configure({ mode: 'serial' })

test.describe('Performance', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.afterAll(async () => {
    console.log('\n=== Tindahan POS performance summary ===')
    for (const [label, value] of Object.entries(results)) {
      console.log(`  ${label}: ${typeof value === 'number' ? `${value}ms` : value}`)
    }
    console.log('=========================================\n')
    await page.close()
  })

  test('login page loads quickly for an unauthenticated visitor', async () => {
    const timing = await measureNav(page, '/login')
    results['Login page — DOMContentLoaded'] = timing.domContentLoaded
    results['Login page — First Contentful Paint'] = timing.firstContentfulPaint ?? 'n/a'

    expect(timing.domContentLoaded, 'DOMContentLoaded should be well under 5s').toBeLessThan(5000)
  })

  test('login submit → POS Checkout render', async () => {
    const ms = await timeAction(() => login(page, TEST_EMAIL, TEST_PASSWORD))
    results['Login submit → POS visible'] = ms
    expect(ms, 'login round trip should be well under 5s').toBeLessThan(5000)
  })

  test('page navigations while authenticated', async () => {
    for (const [route, label, heading] of [
      ['/inventory', 'Inventory', 'Inventory'],
      ['/admin', 'Admin dashboard', 'Admin dashboard'],
      ['/staff', 'Staff', 'Staff'],
      ['/pos', 'POS', 'POS Checkout'],
    ] as const) {
      const navMs = await timeAction(async () => {
        await page.goto(route)
        await expect(page.getByRole('heading', { name: heading })).toBeVisible()
      })
      results[`Navigate to ${label}`] = navMs
      expect(navMs, `${label} should render well under 5s`).toBeLessThan(5000)
    }
  })

  test('Inventory renders and search filters against the real product catalog', async () => {
    const loadMs = await timeAction(async () => {
      await page.goto('/inventory')
      await expect(page.getByText(/products tracked\./)).toBeVisible()
    })
    results['Inventory load (real staging catalog)'] = loadMs
    expect(loadMs, 'Inventory should render well under 5s').toBeLessThan(5000)

    const searchMs = await timeAction(async () => {
      await page.getByPlaceholder('Search by name, category, or barcode').fill('Kopiko')
      await expect(page.getByRole('cell', { name: /Kopiko/ }).first()).toBeVisible()
    })
    results['Inventory search filter latency'] = searchMs
    expect(searchMs, 'search filtering should feel instant (well under 2s)').toBeLessThan(2000)
  })

  test('POS add-to-cart and cart-update interaction latency', async () => {
    await page.goto('/pos')

    const searchAddMs = await timeAction(async () => {
      await page.getByPlaceholder('e.g. sardines').fill('Kopiko')
      await page.getByRole('button', { name: /Kopiko/ }).first().click()
      await expect(page.getByLabel('Cart items').getByText(/Kopiko/)).toBeVisible()
    })
    results['Search → add to cart'] = searchAddMs
    expect(searchAddMs, 'adding an item to the cart should feel instant (well under 1.5s)').toBeLessThan(
      1500
    )

    const totalBefore = await page.getByTestId('cart-total').innerText()
    const quantityMs = await timeAction(async () => {
      await page.getByRole('button', { name: /Increase quantity/ }).click()
      await expect(page.getByTestId('cart-total')).not.toHaveText(totalBefore)
    })
    results['Quantity +1 → total updates'] = quantityMs
    expect(quantityMs, 'quantity stepper should feel instant (well under 1s)').toBeLessThan(1000)

    // Cancel rather than complete the sale — this is the shared staging
    // demo account, and this test only cares about UI responsiveness, not
    // about writing another sale into the restored demo data.
    await page.getByRole('button', { name: 'Cancel sale' }).click()
    await expect(page.getByText('Cart is empty')).toBeVisible()
  })
})
