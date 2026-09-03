import { expect, test } from '@playwright/test'
import {
  accessTokenFor,
  canCreateTestAccountsDirectly,
  createTestCashier,
  createTestStoreAccount,
  login,
} from './helpers'

// Reaching a capability your ROLE does not have, by typing its URL.
//
// url-bypass.spec.ts covers the other axis: a capability withdrawn from the
// whole store by plan, module or subscription status. This one is about a
// capability the store holds and the person does not.
//
// It exists because #461 gated the Receiving page after finding it had no role
// check at all, and could not be covered end to end at the time -- every account
// the suite could create was the admin of its own store, so there was no way to
// be a cashier. createTestCashier() closes that.
//
// Two things must hold, and only the second is a security property:
//
//   the client redirects, so a cashier never reaches a form they cannot submit
//   and never sees a raw database error;
//
//   the SERVER refuses the write regardless, which is the actual boundary --
//   the client gate is a courtesy and could be removed tomorrow.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? ''

test.describe('Reaching a capability your role does not have', () => {
  test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')

  let storeName: string
  let cashierEmail: string

  test.beforeEach(async ({ request }) => {
    storeName = `Role ${Date.now()}`
    await createTestStoreAccount(request, { storeName })
    const cashier = await createTestCashier(request, storeName)
    cashierEmail = cashier.email
  })

  test('a cashier typing the receiving URL is sent back to the till', async ({ page }) => {
    await login(page, cashierEmail)
    await page.goto('/inventory/receiving')

    await expect(page).toHaveURL(/\/pos/)
    // Not merely redirected -- the form must not be reachable at all.
    await expect(page.getByRole('button', { name: 'Save receiving entry' })).toHaveCount(0)
  })

  test('and the server refuses the write even without the client', async ({ request }) => {
    const token = await accessTokenFor(request, cashierEmail)

    // Straight at PostgREST, no browser involved. This is what the client gate
    // is defence in depth for.
    const res = await request.post(`${SUPABASE_URL}/rest/v1/receiving_entries`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { supplier: 'Bypass Attempt', received_on: '2026-09-03' },
    })

    expect(res.ok()).toBe(false)
    expect([401, 403]).toContain(res.status())
  })

  test('the store admin is unaffected -- the control is the role, not the page', async ({
    page,
    request,
  }) => {
    // The control. Without it, every assertion above would pass just as well
    // against an app where receiving was broken for everyone.
    const admin = await createTestStoreAccount(request, { storeName: `Role Admin ${Date.now()}` })
    await login(page, admin.email)
    await page.goto('/inventory/receiving')

    await expect(page.getByRole('button', { name: 'Save receiving entry' })).toBeVisible()
  })
})
