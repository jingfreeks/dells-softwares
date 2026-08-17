import { expect, test } from '@playwright/test'
import { addProduct, canCreateTestAccountsDirectly, loginAsFreshStore, uniqueEmail } from './helpers'
import { PAGE_HEADING_POS, ARIA_DASHBOARD_DATE } from './helpers'
import { SEG_SIGN_IN } from '../src/lib/textLabels/textLabels'

// These tests exercise the app's actual security boundaries — Row Level
// Security policies and route guards — rather than just UI behavior.
// They run against the real staging Supabase project (see helpers.ts),
// the same as the rest of the e2e suite.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
// Server-side only — deliberately NOT prefixed with VITE_ so it can
// never accidentally end up in the client bundle. Only used here, from
// Node, to prove what an anon/authenticated client cannot do by
// attempting it directly against the REST API and confirming it's
// rejected or silently no-ops, then reading back the true state with
// this privileged key. Never sent to the browser.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('Multi-tenant data isolation (RLS)', () => {
  test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')

  test('a store cannot see another store\'s products, sales, or dashboard data', async ({
    browser,
    request,
  }) => {
    const storeAContext = await browser.newContext()
    const storeAPage = await storeAContext.newPage()
    await loginAsFreshStore(request, storeAPage, { storeName: 'Store A — Security Test' })
    await addProduct(storeAPage, {
      name: 'Store A Secret Product',
      category: 'Store A Category',
      price: '99',
      stock: '5',
    })

    const storeBContext = await browser.newContext()
    const storeBPage = await storeBContext.newPage()
    await loginAsFreshStore(request, storeBPage, { storeName: 'Store B — Security Test' })

    // Store B's inventory must never show Store A's product, even though
    // both are querying the same `products` table — RLS on store_id is
    // the only thing standing between the two tenants.
    await storeBPage.goto('/inventory')
    await expect(storeBPage.getByText(/products tracked\./)).toBeVisible()
    await expect(storeBPage.getByRole('row', { name: 'Store A Secret Product' })).toHaveCount(0)

    // Same for the admin dashboard's recent sales / stats — nothing from
    // Store A should leak into Store B's numbers.
    await storeBPage.goto('/admin')
    await expect(storeBPage.getByLabel(ARIA_DASHBOARD_DATE)).toBeVisible()
    await expect(storeBPage.getByText('Store A Secret Product')).toHaveCount(0)

    await storeAContext.close()
    await storeBContext.close()
  })
})

test.describe('feature_flags table write protection', () => {
  test.skip(
    !SUPABASE_URL || !SUPABASE_ANON_KEY,
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set'
  )

  test('an authenticated client cannot write to feature_flags — only service_role can', async ({
    request,
    page,
  }) => {
    test.skip(!SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY not set — cannot verify the read-back')

    await loginAsFreshStore(request, page, { storeName: 'Flag Write Test Store' })

    // Pull this session's access token out of localStorage so we can
    // attempt the write as a genuinely authenticated (not just anon)
    // client — the strongest test of the "no insert/update/delete policy
    // for anon/authenticated" claim in migration 0007.
    const accessToken = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.includes('-auth-token'))
      if (!key) return null
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw)?.access_token ?? null) : null
    })
    expect(accessToken, 'expected an active Supabase session to attempt the write with').toBeTruthy()

    const testKey = `e2e-security-${Date.now()}`

    // Attempt an authenticated write directly against the REST API —
    // exactly what a malicious/compromised client-side session could try.
    const insertRes = await request.post(`${SUPABASE_URL}/rest/v1/feature_flags`, {
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      data: { key: testKey, enabled: false, description: 'should be rejected by RLS' },
    })

    // PostgREST returns either an error, or 201 with an EMPTY body when
    // RLS silently filters the row back out post-insert — both count as
    // "the write didn't take", but only a privileged read can prove it.
    const insertBody = await insertRes.json().catch(() => null)
    const rowVisibleToInserter = Array.isArray(insertBody) && insertBody.length > 0

    const privilegedRead = await request.get(
      `${SUPABASE_URL}/rest/v1/feature_flags?key=eq.${testKey}&select=key`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    )
    const rows = await privilegedRead.json()

    expect(
      rowVisibleToInserter,
      'an authenticated (non-service-role) client should never see its own feature_flags insert succeed'
    ).toBe(false)
    expect(rows, 'the row must not actually exist in the database').toEqual([])

    // Cleanup in case RLS regressed and the row did get created.
    if (rows.length > 0) {
      await request.delete(`${SUPABASE_URL}/rest/v1/feature_flags?key=eq.${testKey}`, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      })
    }
  })

  test('feature_flags remains readable without auth (needed pre-login)', async ({ request }) => {
    const res = await request.get(`${SUPABASE_URL}/rest/v1/feature_flags?select=key,enabled&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY! },
    })
    expect(res.ok()).toBe(true)
  })
})

test.describe('Route guards', () => {
  for (const route of ['/pos', '/inventory', '/admin', '/staff', '/inventory/receiving']) {
    test(`${route} redirects an unauthenticated visitor to login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }

  test('logging out clears the session so a protected route redirects again', async ({ page, request }) => {
    test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')
    await loginAsFreshStore(request, page)
    await expect(page.getByRole('heading', { name: PAGE_HEADING_POS })).toBeVisible()

    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/login/)

    // Directly requesting a protected route post-logout must not serve
    // stale/cached authenticated content.
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })

  test('an incorrect password does not leak whether the email exists', async ({ page }) => {
    await page.goto('/login')
    const email = uniqueEmail('security-probe')
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('definitely-wrong')
    await page.getByRole('button', { name: SEG_SIGN_IN }).click()

    // Same generic message for "no such user" and "wrong password" —
    // a distinct message for either would let an attacker enumerate
    // registered store-owner emails.
    await expect(page.getByRole('alert')).toHaveText(/incorrect email or password/i)
  })
})

test.describe('Stored-input rendering safety (XSS)', () => {
  test('a product name containing markup renders as literal text, not HTML', async ({ page, request }) => {
    test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')
    await loginAsFreshStore(request, page)

    const hostileName = '<img src=x onerror="window.__xss=true">Sardines'
    await addProduct(page, {
      name: hostileName,
      category: 'Security Test',
      price: '10',
      stock: '5',
    })

    // React escapes text content by default; this only breaks if some
    // future change renders product names via dangerouslySetInnerHTML
    // or similar. Confirm no injected script actually ran…
    const xssFired = await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)
    expect(xssFired).toBeUndefined()

    // …and that the literal markup is visible as plain text, not
    // silently stripped (which would mask a real escaping bug either
    // way — we want to see the raw string rendered inertly).
    await expect(page.getByRole('row', { name: hostileName })).toBeVisible()
  })
})
