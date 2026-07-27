import { expect, test, type Page } from '@playwright/test'
import { canCreateTestAccountsDirectly, loginAsFreshStore } from './helpers'

// Coverage for the admin daily sales report (PDF download/print/share,
// both the combined report and the per-card single-section exports).

test.describe('Daily sales report', () => {
  test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')

  test.beforeEach(async ({ page, request }) => {
    await loginAsFreshStore(request, page)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible()
  })

  test('the report card and every stat/list card action icon is present', async ({ page }) => {
    await expect(page.getByText('Daily sales report')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download report as PDF' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Print report' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Share report' })).toBeVisible()

    for (const label of ["Today's sales", 'Transactions today', 'Low stock', 'Total products']) {
      // exact: true matters here — "Print Low stock" is otherwise a
      // substring match of "Print Low stock alerts" (the list card).
      await expect(page.getByRole('button', { name: `Download ${label} as PDF`, exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: `Print ${label}`, exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: `Share ${label}`, exact: true })).toBeVisible()
    }
  })

  test('downloading the combined report produces a real PDF file', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download report as PDF' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^daily-sales-report-\d{4}-\d{2}-\d{2}\.pdf$/)

    const path = await download.path()
    expect(path, 'download should have saved to a temp file').toBeTruthy()
  })

  test('downloading a single card (Recent sales) produces its own focused PDF', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download Recent sales as PDF' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^recent-sales-\d{4}-\d{2}-\d{2}\.pdf$/)
  })

  // Printing opens a window synchronously (window.open("", "_blank")) and
  // then writes an <embed src="blob:..."> into that same about:blank
  // document, rather than navigating the window's top-level URL to the
  // blob — Chromium silently blocks navigating an already-open window to
  // a blob: URL from the opener's script. So the popup's own .url() stays
  // "about:blank" by design; what to check is the embed it was given.
  async function embedSrc(popup: Page): Promise<string | null> {
    const getSrc = () => popup.evaluate(() => document.querySelector('embed')?.getAttribute('src') ?? null)
    await expect.poll(getSrc, { timeout: 10_000 }).not.toBeNull()
    return getSrc()
  }

  test('printing the combined report opens a new tab with the generated PDF', async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: 'Print report' }).click(),
    ])
    expect(await embedSrc(popup)).toMatch(/^blob:/)
    await popup.close()
  })

  test('printing a single card opens a new tab, independent of the combined report', async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: "Print Today's sales", exact: true }).click(),
    ])
    expect(await embedSrc(popup)).toMatch(/^blob:/)
    await popup.close()
  })

  test('sharing falls back to a download with a visible notice when the Web Share API is unavailable', async ({
    page,
  }) => {
    // Playwright's default Chromium doesn't implement navigator.share,
    // so this exercises the exact fallback path real desktop browsers
    // without OS-level share integration would hit too.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Share report' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
    await expect(page.getByRole('status')).toContainText(/sharing isn't supported/i)
  })

  test('report actions do not error when there is no sales data yet', async ({ page }) => {
    // A brand-new store from loginAsFreshStore has zero sales/products
    // beyond what the test adds — this is exactly that empty state,
    // which is where "no rows" branches in the PDF builder are exercised.
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download report as PDF' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
    expect(errors, 'generating a report for an empty store should not throw').toEqual([])
  })
})
