import { expect, test } from '@playwright/test'
import { canCreateTestAccountsDirectly, createTestStoreAccount, login, sql } from './helpers'

// Add-ons, in a real browser against a real database.
//
// Unit tests mock current_store_has_module()/request_addon() entirely -- they
// prove the component, not the wiring. What matters here: the request really
// lands as a note an operator can read, requesting never activates anything
// itself, and a console-granted ADDON really does unlock the module and
// survives the same re-materialization a plan change triggers.

test.describe('Add-ons', () => {
  test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')

  let storeName: string
  let email: string

  test.beforeEach(async ({ request }) => {
    storeName = `Addon ${Date.now()}`
    const account = await createTestStoreAccount(request, { storeName })
    email = account.email
  })

  // A fresh store provisions on BASIC, which does not sell ACCOUNTING --
  // that starts at PRO/ENTERPRISE -- so the offer must be visible by default.
  test('offers the Accounting add-on when the store does not hold it', async ({ page }) => {
    await login(page, email, 'testpass123')
    await page.goto('/settings/plan')

    await expect(page.getByText('Add-ons')).toBeVisible()
    await expect(page.getByText('Accounting')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Request add-on' })).toBeVisible()
  })

  test('requesting records a note for an operator, and activates nothing', async ({ page }) => {
    await login(page, email, 'testpass123')
    await page.goto('/settings/plan')

    await page.getByRole('button', { name: 'Request add-on' }).click()
    await expect(page.getByText('Requested')).toBeVisible()

    const notes = await sql(
      `select notes from core.organization_subscriptions
         where organization_id = (select id from stores where name = '${storeName}')`
    )
    expect(notes).toContain('Requested add-on: ACCOUNTING')

    // A BASIC store has no organization_modules row for ACCOUNTING at all --
    // it is only materialized for plans that sell it. Absent, or present and
    // disabled, both mean "not activated"; only 't' would mean the request
    // itself turned something on.
    const enabled = await sql(
      `select enabled from core.organization_modules
         where module_code = 'ACCOUNTING'
           and organization_id = (select id from stores where name = '${storeName}')`
    )
    expect(enabled).not.toBe('t')
  })

  // Simulates what the console's "Grant as paid add-on" checkbox does under
  // the hood -- platform_set_module(..., p_source => 'ADDON') -- directly via
  // SQL, since service_role cannot call the platform-admin RPC itself. Uses
  // the same insert-or-update platform_set_module() itself uses, since a
  // BASIC store starts with no organization_modules row for ACCOUNTING at all.
  test('a console-granted add-on unlocks the module and the card disappears', async ({ page }) => {
    await sql(
      `insert into core.organization_modules (organization_id, module_code, enabled, source)
       select id, 'ACCOUNTING', true, 'ADDON' from stores where name = '${storeName}'
       on conflict (organization_id, module_code) do update
         set enabled = true, source = 'ADDON', valid_until = null`
    )

    await login(page, email, 'testpass123')
    await page.goto('/settings/plan')

    await expect(page.getByText('Utang (customer credit)')).toBeVisible()
    await expect(page.getByText('Add-ons')).not.toBeVisible()
  })

  // Durability claim: an ADDON-sourced grant must survive the exact operation
  // a real plan change triggers -- re-materialization -- the same way a
  // MANUAL comp already does. Not just that the constraint accepts the value.
  test('the add-on survives re-materialization, the same operation a plan change triggers', async ({ page }) => {
    await sql(
      `insert into core.organization_modules (organization_id, module_code, enabled, source)
       select id, 'ACCOUNTING', true, 'ADDON' from stores where name = '${storeName}'
       on conflict (organization_id, module_code) do update
         set enabled = true, source = 'ADDON', valid_until = null`
    )
    await sql(
      `do $$ begin
         perform core.materialize_subscription_modules(
           (select id from stores where name = '${storeName}')
         );
       end $$;`
    )

    const row = await sql(
      `select enabled || ',' || source from core.organization_modules
         where module_code = 'ACCOUNTING'
           and organization_id = (select id from stores where name = '${storeName}')`
    )
    expect(row).toBe('true,ADDON')

    await login(page, email, 'testpass123')
    await page.goto('/settings/plan')
    await expect(page.getByText('Add-ons')).not.toBeVisible()
  })
})
