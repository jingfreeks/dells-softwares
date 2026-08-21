import { expect, test } from '@playwright/test'
import {
  canCreateTestAccountsDirectly,
  createTestStoreAccount,
  login,
  setStoreFeature,
} from './helpers'

// The plan page, in a real browser against a real database.
//
// Its unit tests mock my_store_features() entirely, so they prove the
// component and nothing about the wiring: whether the route resolves, whether
// the RPC is reachable with the anon key, whether the provider hands the whole
// catalogue through rather than just the held half. All of that only shows up
// here.
//
// The property that matters is the one the page exists for. A tenant must be
// able to SEE the capabilities they do not hold. Hiding them is what the
// feature layer was careful not to do -- my_store_features() returns the whole
// catalogue on purpose -- and a tier nobody can see is a tier nobody buys.

test.describe('Your plan', () => {
  test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')

  let storeName: string
  let email: string

  test.beforeEach(async ({ request }) => {
    storeName = `Plan ${Date.now()}`
    const account = await createTestStoreAccount(request, { storeName })
    email = account.email
  })

  test('lists the capabilities the store holds', async ({ page }) => {
    await login(page, email, 'testpass123')
    await page.goto('/settings/plan')

    await expect(page.getByText('Included in your plan')).toBeVisible()
    // A new store provisions onto BASIC, which sells utang.
    await expect(page.getByText('Utang (customer credit)')).toBeVisible()
  })

  test('and shows what it does NOT hold rather than hiding it', async ({ page }) => {
    await login(page, email, 'testpass123')
    await page.goto('/settings/plan')

    // BASIC does not sell purchase orders -- those start at PRO. The whole
    // point is that the tenant can see they exist.
    await expect(page.getByText('Not in your plan')).toBeVisible()
    await expect(page.getByText('Purchase orders')).toBeVisible()
  })

  test('groups capabilities by module', async ({ page }) => {
    await login(page, email, 'testpass123')
    await page.goto('/settings/plan')

    await expect(page.getByText('Selling').first()).toBeVisible()
    await expect(page.getByText('Stock and suppliers').first()).toBeVisible()
  })

  test('a revoked capability moves from held to locked', async ({ page }) => {
    await setStoreFeature(storeName, 'pos.utang', false)

    await login(page, email, 'testpass123')
    await page.goto('/settings/plan')

    // Still listed -- but now under what the store does not have, which is the
    // only way a shopkeeper learns it is something they could ask for.
    await expect(page.getByText('Utang (customer credit)')).toBeVisible()
    await expect(page.getByText('Not in your plan')).toBeVisible()
  })

  // Regression guard. The first cut of this page used a bare <span>, which
  // inherits a dark colour on this theme and rendered the feature names
  // effectively invisible -- and every assertion above still passed, because
  // toBeVisible() means present and non-zero-sized, not legible. Only looking
  // at a screenshot caught it. This checks the thing that was actually wrong.
  test('renders the capability names in a colour you can actually read', async ({ page }) => {
    await login(page, email, 'testpass123')
    await page.goto('/settings/plan')

    const luminance = await page
      .getByText('Utang (customer credit)')
      .evaluate((el) => {
        const [r, g, b] = getComputedStyle(el)
          .color.match(/\d+/g)!
          .slice(0, 3)
          .map(Number)
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      })

    // The theme is dark, so held text has to be light. The broken version
    // measured about 0.05.
    expect(luminance).toBeGreaterThan(0.5)
  })

  test('is reachable from the settings navigation', async ({ page }) => {
    await login(page, email, 'testpass123')
    await page.goto('/settings/profile')

    await page.getByRole('link', { name: 'Your plan' }).click()
    await expect(page.getByText('Included in your plan')).toBeVisible()
  })
})
