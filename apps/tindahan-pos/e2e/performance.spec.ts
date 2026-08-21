import { expect, test, type Page } from '@playwright/test'
import {
  login,
  createTestStoreAccount,
  primeCashierPin,
  startCashierSession,
  addProduct,
} from './helpers'
import { ARIA_DASHBOARD_DATE } from './helpers'
import {
  LABEL_SCAN_OR_SEARCH_PRODUCTS,
  PAGE_HEADING_POS,
  LABEL_CASHIER_PICKER_HEADING,
  ARIA_EXPORT_EXCEL,
} from '../src/lib/textLabels/textLabels'

// Speed check for the app's key screens and interactions, against a real
// Supabase project (not mocked) so the numbers reflect actual network
// round-trips. Thresholds are intentionally generous — this isn't a strict
// CI gate, it's meant to catch a genuine regression (a page that used to
// load in under a second suddenly taking five) without flaking on normal
// network jitter to Supabase.
//
// Uses the existing staging demo account (already seeded with a realistic
// product catalog) rather than self-registering through the public signup
// endpoint, which is rate-limited. "How fast is the app for someone who
// already has an account" is the realistic thing to measure anyway — nobody
// re-registers between every screen.
//
// The account is now provisioned through the Admin API per run, like every
// other spec. It used to fall back to a hardcoded real address and password
// ('StagingTest123!') committed in this file, which meant the suite could
// only run where that account existed — it failed immediately against a local
// stack — and put a working credential in source control. PERF_TEST_EMAIL /
// PERF_TEST_PASSWORD still override, for pointing this at a populated store
// where the timings are more representative.

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
  let testEmail: string
  let testPassword: string

  test.beforeAll(async ({ browser, playwright }) => {
    page = await browser.newPage()

    if (process.env.PERF_TEST_EMAIL && process.env.PERF_TEST_PASSWORD) {
      testEmail = process.env.PERF_TEST_EMAIL
      testPassword = process.env.PERF_TEST_PASSWORD
      return
    }

    const request = await playwright.request.newContext()
    const account = await createTestStoreAccount(request)
    testEmail = account.email
    testPassword = account.password
    // Without an open register the app bounces back to the cashier picker,
    // so these navigations would time the picker rather than the pages.
    await primeCashierPin(request, testEmail)
    await request.dispose()
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
    const ms = await timeAction(() => login(page, testEmail, testPassword))
    results['Login submit → POS visible'] = ms
    expect(ms, 'login round trip should be well under 5s').toBeLessThan(5000)
  })

  test('page navigations while authenticated', async () => {
    // Open the register first: this measures navigation for a cashier who is
    // actually working, which is the realistic case and also the only state in
    // which every one of these routes renders its own page.
    await startCashierSession(page)

    // Each route needs its own "this page has rendered" landmark rather than a
    // heading name: /admin has no heading at all (its title is a time-based
    // greeting in a <p>), and /pos shows the cashier picker until a session is
    // started. This test measures navigation cost, so it should not depend on
    // session state -- it accepts either POS screen.
    const landmarks: Record<string, (p: Page) => ReturnType<Page['getByRole']>> = {
      '/inventory': (p) => p.getByRole('heading', { name: 'Inventory' }),
      '/admin': (p) => p.getByLabel(ARIA_DASHBOARD_DATE),
      '/staff': (p) => p.getByRole('heading', { name: 'Staff' }),
      '/pos': (p) =>
        p
          .getByRole('heading', { name: PAGE_HEADING_POS })
          .or(p.getByText(LABEL_CASHIER_PICKER_HEADING)),
    }

    for (const [route, label] of [
      ['/inventory', 'Inventory'],
      ['/admin', 'Admin dashboard'],
      ['/staff', 'Staff'],
      ['/pos', 'POS'],
    ] as const) {
      const navMs = await timeAction(async () => {
        await page.goto(route)
        await expect(landmarks[route](page)).toBeVisible()
      })
      results[`Navigate to ${label}`] = navMs
      expect(navMs, `${label} should render well under 5s`).toBeLessThan(5000)
    }
  })

  test('Inventory renders and search filters against the product catalog', async () => {
    // 'Kopiko' used to be assumed present because this spec ran against a
    // populated staging account. It now provisions its own store, so the thing
    // being searched for has to exist first.
    //
    // Worth stating plainly: a freshly-created store is a small catalog, so
    // these timings are optimistic compared with a real one. That is what
    // PERF_TEST_EMAIL is for -- point this at a populated store when the
    // number needs to mean something.
    await addProduct(page, {
      name: 'Kopiko Brown Coffee',
      category: 'Beverages',
      price: '12',
      stock: '40',
    })

    const loadMs = await timeAction(async () => {
      await page.goto('/inventory')
      await expect(page.getByText(/products tracked\./)).toBeVisible()
    })
    results['Inventory load (real staging catalog)'] = loadMs
    expect(loadMs, 'Inventory should render well under 5s').toBeLessThan(5000)

    const searchMs = await timeAction(async () => {
      await page.getByPlaceholder('Search by name, category, or barcode').fill('Kopiko')
      await expect(page.getByRole('row', { name: /Kopiko/ }).first()).toBeVisible()
    })
    results['Inventory search filter latency'] = searchMs
    expect(searchMs, 'search filtering should feel instant (well under 2s)').toBeLessThan(2000)
  })

  test('POS add-to-cart and cart-update interaction latency', async () => {
    await page.goto('/pos')
    
    const searchAddMs = await timeAction(async () => {
      await page.getByLabel(LABEL_SCAN_OR_SEARCH_PRODUCTS).fill('Kopiko')
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

  test('Dashboard report export generation', async () => {
    // Report generation is CPU-bound client-side work rather than a network
    // round-trip, so this measures something the other timings don't: how long
    // the browser spends building the workbook.
    //
    // It used to build a PDF with jsPDF. That feature is gone -- there is no
    // 'Download report as PDF' button and no PDF library in src/ -- and the
    // dashboard now exports Excel via ExcelJS, which is what this times.
    await page.goto('/admin')
    await expect(page.getByLabel(ARIA_DASHBOARD_DATE)).toBeVisible()

    const downloadMs = await timeAction(async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: ARIA_EXPORT_EXCEL }).click(),
      ])
      await download.path()
    })
    results['Dashboard report export (download)'] = downloadMs
    expect(downloadMs, 'building and downloading the report should feel instant (well under 3s)').toBeLessThan(
      3000
    )
  })
})
