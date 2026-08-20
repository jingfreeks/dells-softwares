import { expect, test, type APIRequestContext } from '@playwright/test'
import { loginAsFreshStore, primeCashierPin, startCashierSession } from './helpers'
import { PAGE_HEADING_POS } from './helpers'
import { LABEL_SCAN_OR_SEARCH_PRODUCTS } from '../src/lib/textLabels/textLabels'

// Regression coverage for the feature-flags kill switch itself (migration
// 0007) and the two features currently wired to it: pos_services and
// pack_pricing (migration 0008). These flags are the app's designated
// "turn this off in production without a redeploy" mechanism, so a
// silent regression here is exactly the kind of thing that should fail
// CI rather than be discovered during a real incident.
//
// Flags are flipped directly via the REST API using the service_role
// key (the only role allowed to write to feature_flags — see
// security.spec.ts for the test proving anon/authenticated cannot).

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('Feature flag kill switches', () => {
  test.skip(
    !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY,
    'VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — cannot toggle flags for this suite'
  )

  async function setFlag(request: APIRequestContext, key: string, enabled: boolean) {
    const res = await request.post(`${SUPABASE_URL}/rest/v1/feature_flags`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      data: { key, enabled, description: 'set by e2e feature-flags.spec.ts' },
    })
    expect(res.ok(), `failed to set flag ${key}=${enabled}`).toBe(true)
  }

  async function clearFlag(request: APIRequestContext, key: string) {
    await request.delete(`${SUPABASE_URL}/rest/v1/feature_flags?key=eq.${key}`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })
  }

  test.afterEach(async ({ request }) => {
    // Always leave flags absent (= enabled, fail-open) so this suite
    // never leaks state into other tests or a shared staging account.
    await clearFlag(request, 'pos_services')
    await clearFlag(request, 'pack_pricing')
  })

  test('disabling pos_services hides the Services tab in POS', async ({ page, request }) => {
    const email = await loginAsFreshStore(request, page)
    await primeCashierPin(request, email)
    await startCashierSession(page)
    await expect(page.getByRole('button', { name: 'Services', exact: true })).toBeVisible()

    await setFlag(request, 'pos_services', false)
    await page.reload()

    await expect(page.getByRole('button', { name: 'Services', exact: true })).toHaveCount(0)
    // Products browsing must be completely unaffected by the flag.
    await expect(page.getByRole('heading', { name: PAGE_HEADING_POS })).toBeVisible()
  })

  test('re-enabling pos_services (or removing the row) brings the tab back', async ({ page, request }) => {
    const email = await loginAsFreshStore(request, page)
    await primeCashierPin(request, email)
    await setFlag(request, 'pos_services', false)
    // Must open the register: /pos is the cashier picker until a session is
    // started, and the picker has no Services tab either -- so asserting
    // absence there would pass for the wrong reason.
    await startCashierSession(page)
    await expect(page.getByRole('button', { name: 'Services', exact: true })).toHaveCount(0)

    await setFlag(request, 'pos_services', true)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Services', exact: true })).toBeVisible()
  })

  test('a flag with no row at all defaults to enabled (fail-open)', async ({ page, request }) => {
    // afterEach already clears both flags, but assert the precondition
    // explicitly so this test documents the fail-open contract on its own.
    await clearFlag(request, 'pos_services')
    const email = await loginAsFreshStore(request, page)
    await primeCashierPin(request, email)
    await startCashierSession(page)
    await expect(page.getByRole('button', { name: 'Services', exact: true })).toBeVisible()
  })

  test('disabling an unrelated flag does not affect pos_services', async ({ page, request }) => {
    await setFlag(request, 'some_unrelated_flag', false)
    const email = await loginAsFreshStore(request, page)
    await primeCashierPin(request, email)
    await startCashierSession(page)
    await expect(page.getByRole('button', { name: 'Services', exact: true })).toBeVisible()
    await clearFlag(request, 'some_unrelated_flag')
  })

  test('disabling pack_pricing makes checkout charge regular price instead of pack price', async ({
    page,
    request,
  }) => {
    const email = await loginAsFreshStore(request, page)
    await primeCashierPin(request, email)

    // Create a pack-priced product while the flag is still enabled
    // (default) — 3 pcs for ₱20, i.e. ~₱6.67/pc.
    await page.goto('/inventory')
    await page.getByRole('button', { name: 'Add product' }).click()
    await page.getByLabel('Name', { exact: true }).fill('Pack Priced Candy')
    await page.getByLabel('Category', { exact: true }).selectOption({ label: '+ New category…' })
    await page.getByPlaceholder('New category name').fill('Pack Test')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.getByLabel(/Sell by pack/).check()
    await page.getByLabel('Pack size (pcs)').fill('3')
    await page.getByLabel('Pack price (₱)').fill('20')
    await page.getByLabel('Stock', { exact: true }).fill('30')
    await page.locator('form').getByRole('button', { name: 'Add product' }).click()
    await expect(page.getByRole('row', { name: 'Pack Priced Candy' })).toBeVisible()

    // With the flag on, POS shows the pack label and charges pack math.
    await startCashierSession(page)
    await page.getByLabel(LABEL_SCAN_OR_SEARCH_PRODUCTS).fill('Pack Priced Candy')
    await page.getByLabel(LABEL_SCAN_OR_SEARCH_PRODUCTS).press('Enter')
    await page.getByRole('button', { name: /Increase quantity/ }).click()
    await page.getByRole('button', { name: /Increase quantity/ }).click()
    // 3 pcs at pack price = exactly ₱20.00.
    await expect(page.getByTestId('cart-total')).toHaveText('₱20.00')

    // Disabling pack_pricing must make checkout_sale() itself (not just
    // the UI) fall back to the regular per-unit price — the whole point
    // of gating the RPC in migration 0008, not just the client.
    await setFlag(request, 'pack_pricing', false)
    await page.reload()

    // The cart survives a reload, so the three pieces from the pack-priced
    // half are still in it. Clear them, or the second total is six pieces
    // (₱40.02) and the assertion below measures the wrong thing.
    await page.getByRole('button', { name: /Remove Pack Priced Candy/ }).click()
    await expect(page.getByText('Cart is empty')).toBeVisible()

    await page.getByLabel(LABEL_SCAN_OR_SEARCH_PRODUCTS).fill('Pack Priced Candy')
    await page.getByLabel(LABEL_SCAN_OR_SEARCH_PRODUCTS).press('Enter')
    await page.getByRole('button', { name: /Increase quantity/ }).click()
    await page.getByRole('button', { name: /Increase quantity/ }).click()
    // Regular price is the rounded pack-unit price (₱6.67) × 3 = ₱20.01,
    // one centavo off from the pack total — proof the pack math branch
    // is genuinely not running, not just hidden.
    await expect(page.getByTestId('cart-total')).toHaveText('₱20.01')
  })
})
