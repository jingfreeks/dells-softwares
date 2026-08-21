import { expect, test } from '@playwright/test'
import {
  canCreateTestAccountsDirectly,
  createTestStoreAccount,
  login,
  seedSupplier,
  setStoreFeature,
  setStoreModule,
  setSubscriptionStatus,
} from './helpers'
import { BUTTON_ADD_SUPPLIER, PAGE_HEADING_SUPPLIERS } from '../src/lib/textLabels/textLabels'

// Reaching a withdrawn capability by typing its URL.
//
// Architecture v1 is explicit that "ModuleGate is UX, not security" -- hiding a
// link is a courtesy, and the database is the boundary. This suite is the proof
// of that claim rather than a restatement of it: it takes every route by which
// a capability can be withdrawn, walks straight past the missing navigation,
// and checks what the server actually does.
//
// /suppliers is the honest place to test it, because it has NO NAVIGATION ENTRY
// AT ALL -- in this app the URL is the only way in, so "hidden in the UI,
// reachable by address bar" is its normal condition rather than a contrivance.
//
// Two things must hold at once, and they pull in opposite directions:
//
//   the WRITE is refused, whichever of the three withdrawal routes was used --
//   a feature revoked, its module disabled, or the subscription suspended;
//
//   the READ survives all three, because §08 says data is never destroyed on
//   downgrade and a tenant must be able to see and export what they recorded.
//
// A suite that only checked the first would pass just as well against an app
// that had deleted the tenant's data.

test.describe('Reaching a withdrawn capability by URL', () => {
  test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')

  let storeName: string
  let email: string

  test.beforeEach(async ({ request }) => {
    storeName = `Bypass ${Date.now()}`
    const account = await createTestStoreAccount(request, { storeName })
    email = account.email
    // Recorded while the store still holds the capability, so the
    // read-survives assertions have something real to find. Without it they
    // would pass on an empty table and prove nothing.
    await seedSupplier(storeName, 'Aling Nena Trading')
  })

  /** Open the add form, try to save a supplier, and return what the user is told. */
  async function attemptAddSupplier(page: import('@playwright/test').Page, name: string) {
    await page.getByRole('button', { name: BUTTON_ADD_SUPPLIER }).first().click()
    await page.locator('#supName').fill(name)
    await page.getByRole('button', { name: BUTTON_ADD_SUPPLIER, exact: true }).last().click()
    return page.getByRole('alert')
  }

  test('nothing in the app links to /suppliers, and the URL reaches it anyway', async ({ page }) => {
    await login(page, email, 'testpass123')
    await page.goto('/pos')
    await expect(page.getByRole('link', { name: PAGE_HEADING_SUPPLIERS })).toHaveCount(0)

    await page.goto('/suppliers')
    await expect(page.getByText('Aling Nena Trading')).toBeVisible()
  })

  test('a revoked feature refuses the write but never the read', async ({ page }) => {
    await setStoreFeature(storeName, 'inventory.suppliers', false)
    await login(page, email, 'testpass123')
    await page.goto('/suppliers')

    // §08 first: the records are still theirs.
    await expect(page.getByText('Aling Nena Trading')).toBeVisible()

    const alert = await attemptAddSupplier(page, 'Should Be Refused')
    await expect(alert).toBeVisible({ timeout: 10_000 })

    // Refused, and said in a sentence. A shopkeeper must never be shown the
    // database's own words for this.
    await expect(alert).not.toContainText('row-level security')
    await expect(alert).not.toContainText('violates')

    // And it has to be WORTH reading. "Could not save supplier." is true and
    // useless -- it sends the owner looking for a typo. This must point at the
    // plan, and must not blame the person: no staff role can grant a
    // capability the plan does not include.
    await expect(alert).toContainText(/plan/i)
    await expect(alert).not.toContainText(/permission/i)
  })

  test('and the refusal actually held -- nothing was written', async ({ page }) => {
    await setStoreFeature(storeName, 'inventory.suppliers', false)
    await login(page, email, 'testpass123')
    await page.goto('/suppliers')
    await attemptAddSupplier(page, 'Should Be Refused')

    await page.reload()
    await expect(page.getByText('Should Be Refused')).toHaveCount(0)
    await expect(page.getByText('Aling Nena Trading')).toBeVisible()
  })

  test('a disabled module refuses the write but never the read', async ({ page }) => {
    await setStoreModule(storeName, 'INVENTORY', false)
    await login(page, email, 'testpass123')
    await page.goto('/suppliers')

    await expect(page.getByText('Aling Nena Trading')).toBeVisible()

    const alert = await attemptAddSupplier(page, 'No Module')
    await expect(alert).toBeVisible({ timeout: 10_000 })
    await expect(alert).not.toContainText('row-level security')
    await expect(alert).toContainText(/plan|billing/i)
  })

  test('a suspended subscription refuses the write but never the read', async ({ page }) => {
    await setSubscriptionStatus(storeName, 'SUSPENDED')
    await login(page, email, 'testpass123')
    await page.goto('/suppliers')

    // The whole point of the grace ladder: an unpaid tenant can still read and
    // export everything they have.
    await expect(page.getByText('Aling Nena Trading')).toBeVisible()

    const alert = await attemptAddSupplier(page, 'Suspended')
    await expect(alert).toBeVisible({ timeout: 10_000 })
    await expect(alert).not.toContainText('row-level security')
    await expect(alert).toContainText(/plan|billing/i)
    // §08 said on the screen: withdrawing writes must never imply the records
    // went anywhere.
    await expect(alert).toContainText(/already recorded is affected|nothing/i)
  })

  test('a store that still holds the capability is unaffected', async ({ page }) => {
    // The control. Without it every assertion above would pass against an app
    // that simply refused to add suppliers for anyone.
    await login(page, email, 'testpass123')
    await page.goto('/suppliers')

    await attemptAddSupplier(page, 'Perfectly Allowed')
    await expect(page.getByText('Perfectly Allowed')).toBeVisible({ timeout: 10_000 })
  })
})
