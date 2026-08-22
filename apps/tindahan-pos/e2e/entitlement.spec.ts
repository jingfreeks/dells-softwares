import { expect, test } from '@playwright/test'
import {
  canCreateTestAccountsDirectly,
  createTestStoreAccount,
  login,
  setStoreFeature,
  sql,
} from './helpers'
import { NAV_LABEL_CUSTOMERS } from '../src/lib/textLabels/textLabels'

// Feature entitlement, end to end in a browser.
//
// The chain built across 20260815109000-112000 has pgTAP coverage for the
// database half and unit coverage for the client half, and nothing that
// proves the two agree. This is that: revoke a capability the way an operator
// would, and watch the app respond.
//
// It matters most for the property that is easy to get backwards. Withholding
// a feature must remove the ABILITY TO ADD, never the ability to look: §08's
// "data is never destroyed on downgrade" is the promise the whole entitlement
// design rests on, and a UI that hid a tenant's own records would break it
// just as thoroughly as a policy that deleted them.

test.describe('Feature entitlement', () => {
  test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')

  let storeName: string
  let email: string

  test.beforeEach(async ({ request }) => {
    storeName = `Entitlement ${Date.now()}`
    const account = await createTestStoreAccount(request, { storeName })
    email = account.email
  })

  test('a store holding utang sees Customers', async ({ page }) => {
    await login(page, email, 'testpass123')
    await page.goto('/admin')
    await expect(page.getByRole('link', { name: NAV_LABEL_CUSTOMERS }).first()).toBeVisible()
  })

  test('revoking utang removes Customers from the navigation', async ({ page }) => {
    await setStoreFeature(storeName, 'pos.utang', false)

    await login(page, email, 'testpass123')
    await page.goto('/admin')

    await expect(page.getByRole('link', { name: NAV_LABEL_CUSTOMERS })).toHaveCount(0)

    // The rest of the app is untouched — revoking one capability must not
    // read as an outage.
    await expect(page.getByRole('link', { name: 'POS' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Inventory' }).first()).toBeVisible()
  })

  test('and the database agrees with what the browser was shown', async ({ page }) => {
    await setStoreFeature(storeName, 'pos.utang', false)
    await login(page, email, 'testpass123')
    await page.goto('/admin')
    await expect(page.getByRole('link', { name: NAV_LABEL_CUSTOMERS })).toHaveCount(0)

    // The UI gate and the server gate are separate mechanisms reading the same
    // row. If they ever disagree, one of them is lying to an operator.
    const enabled = await sql(
      `select core.feature_enabled((select id from stores where name = '${storeName}'), 'pos.utang')`
    )
    expect(enabled).toBe('f')
  })

  test('granting it back brings Customers straight back', async ({ page }) => {
    await setStoreFeature(storeName, 'pos.utang', false)
    await login(page, email, 'testpass123')
    await page.goto('/admin')
    await expect(page.getByRole('link', { name: NAV_LABEL_CUSTOMERS })).toHaveCount(0)

    await setStoreFeature(storeName, 'pos.utang', true)
    await page.reload()

    await expect(page.getByRole('link', { name: NAV_LABEL_CUSTOMERS }).first()).toBeVisible()
  })

  test('a revoked feature never hides the records already made', async ({ page }) => {
    // §08, the promise the whole design rests on. A customer created while the
    // store held utang must still be visible after it is taken away — they are
    // owed money, and the shop needs to see who.
    await sql(
      `insert into customers (store_id, name)
       select id, 'Aling Rosa' from stores where name = '${storeName}'`
    )

    await setStoreFeature(storeName, 'pos.utang', false)

    const stillThere = await sql(
      `select count(*) from customers
        where store_id = (select id from stores where name = '${storeName}')`
    )
    expect(stillThere).toBe('1')

    // And reachable by direct URL, since the nav link is gone: withholding a
    // feature removes the ability to ADD, not the ability to look.
    await login(page, email, 'testpass123')
    await page.goto('/customers')
    await expect(page.getByText('Aling Rosa')).toBeVisible({ timeout: 15_000 })
  })
})
