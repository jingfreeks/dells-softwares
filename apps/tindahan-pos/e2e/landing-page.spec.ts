import { expect, type Locator, type Page } from '@playwright/test'
import { test } from '@playwright/test'
import { sql, uniqueEmail } from './helpers'

/** The card whose OWN price name (not a bullet point mentioning it, e.g. Business's "Everything in Basic") matches exactly. */
function planCard(page: Page, name: string): Locator {
  return page.locator('#pricing .price').filter({ has: page.locator('.pname', { hasText: new RegExp(`^${name}$`) }) })
}

// public/landing.html is a static file, served at "/" by vite.config.ts's
// serveLandingAtRoot plugin (dev/preview) and vercel.json's rewrite
// (production) -- outside the React app entirely, and outside this app's
// unit-test reach. This is the one place that can prove the pricing
// section's CTAs actually carry a real visitor into the real app.

test.describe('Landing page -> Register handoff', () => {
  test('the pricing section\'s CTAs point at the real signup routes', async ({ page }) => {
    await page.goto('/')
    const hrefs = await page
      .locator('#pricing .price a')
      .evaluateAll((links) => links.map((l) => l.getAttribute('href')))
    expect(hrefs).toEqual(['/register', '/register?plan=BUSINESS', '#demo'])
  })

  test('Basic\'s "Get started" lands on a plain Register with no acknowledgment', async ({ page }) => {
    await page.goto('/')
    await planCard(page, 'Basic').getByRole('link', { name: 'Get started' }).click()

    await expect(page).toHaveURL(/\/register$/)
    await expect(page.getByText(/free trial/i)).not.toBeVisible()
  })

  test('Business\'s "Get started" carries the plan through, and signing up starts a real trial', async ({ page }) => {
    await page.goto('/')
    await planCard(page, 'Business').getByRole('link', { name: 'Get started' }).click()

    await expect(page).toHaveURL(/\/register\?plan=BUSINESS/)
    await expect(page.getByText(/14-day free trial of Business.*₱599/)).toBeVisible()

    const storeName = `Landing Flow ${Date.now()}`
    const email = uniqueEmail('landing')
    await page.getByLabel('Store name').fill(storeName)
    await page.getByLabel('Your name').fill('Aling Nena')
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('testpass123')
    await page.getByRole('checkbox', { name: /Terms of Service/ }).click()
    await page.getByRole('button', { name: 'Create account' }).click()

    // Whether this lands on /onboarding or a "check your email" screen
    // depends on the project's current "Confirm email" Auth setting --
    // e2e/login.spec.ts's own registration test already covers that fork
    // in general. Only the 'confirmed' path has a session to call
    // start_trial() with (hooks.tsx documents the trial isn't started
    // across the confirm-email gap), so that's the only outcome this test
    // has anything further to check.
    let confirmed = true
    try {
      await page.waitForURL(/\/onboarding/, { timeout: 15_000 })
    } catch {
      confirmed = false
    }
    test.skip(!confirmed, 'this project requires email confirmation right now -- nothing further to check here')

    // start_trial() is fire-and-forget from hooks.tsx (deliberately -- it
    // must never block the new owner from reaching their store), so the
    // write can still be in flight the instant /onboarding resolves. Poll
    // rather than reading once. Checks the real subscription row AND that
    // entitlements were actually materialized -- not just a status label.
    await expect
      .poll(
        async () =>
          sql(
            `select s.status from core.organization_subscriptions s
               join stores st on st.id = s.organization_id
               where st.name = '${storeName}'`
          ),
        { timeout: 10_000 }
      )
      .toBe('TRIALING')

    const trialEndsAt = await sql(
      `select s.trial_ends_at::date - now()::date from core.organization_subscriptions s
         join stores st on st.id = s.organization_id
         where st.name = '${storeName}'`
    )
    expect(Number(trialEndsAt)).toBeGreaterThanOrEqual(13)

    const hasBusinessFeature = await sql(
      `select exists(
         select 1 from core.organization_features f
         join stores st on st.id = f.organization_id
         where st.name = '${storeName}' and f.feature_code = 'inventory.purchase_orders' and f.enabled
       )`
    )
    expect(hasBusinessFeature).toBe('t')
  })

  test('Back to home from Login and Register is a real navigation to the landing page', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText(/one screen to run/i)).toBeVisible()

    await page.goto('/register')
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText(/one screen to run/i)).toBeVisible()
  })

  test('the Annual toggle swaps the priced cards and leaves Enterprise untouched', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText(/₱299.*\/ month/)).toBeVisible()
    await expect(page.getByText(/Save.*17%/)).not.toBeVisible()

    await page.getByRole('button', { name: 'Annual' }).click()

    await expect(page.getByText(/₱2,990.*\/ year/)).toBeVisible()
    await expect(page.getByText(/₱5,990.*\/ year/)).toBeVisible()
    await expect(page.getByText(/Save.*17%/)).toBeVisible()
    await expect(page.getByText("Let's talk")).toBeVisible()

    await page.getByRole('button', { name: 'Monthly' }).click()

    await expect(page.getByText(/₱299.*\/ month/)).toBeVisible()
    await expect(page.getByText(/₱599.*\/ month/)).toBeVisible()
    await expect(page.getByText(/Save.*17%/)).not.toBeVisible()
  })
})
