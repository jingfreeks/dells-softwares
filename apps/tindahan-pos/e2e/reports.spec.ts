import { expect, test } from '@playwright/test'
import { canCreateTestAccountsDirectly, loginAsFreshStore } from './helpers'
import { ARIA_DASHBOARD_DATE } from './helpers'
import { ARIA_EXPORT_EXCEL } from '../src/lib/textLabels/textLabels'

// Coverage for the admin dashboard's report export.
//
// This file used to cover a PDF report: a combined download, per-card
// single-section exports, print-to-new-tab, and a Web Share fallback --
// seven tests, none of which had run since the CI job was disabled.
//
// That feature no longer exists. There is no 'as PDF', 'Print report' or
// 'Share report' label anywhere in the app and no PDF library in src/; the
// dashboard now offers one action, "Export dashboard report as Excel",
// which builds a workbook with ExcelJS and downloads it as
// <store>-dashboard-<date>.xlsx.
//
// So these are not selectors to repair. Seven tests asserting a removed
// feature are rewritten as three asserting the one that replaced it, keeping
// the original intent: the action is reachable, it produces a real file, and
// it does not fall over on a store with no sales yet.

test.describe('Dashboard report export', () => {
  test.skip(!canCreateTestAccountsDirectly, 'SUPABASE_SERVICE_ROLE_KEY not set')

  test.beforeEach(async ({ page, request }) => {
    await loginAsFreshStore(request, page)
    await page.goto('/admin')
    await expect(page.getByLabel(ARIA_DASHBOARD_DATE)).toBeVisible()
  })

  test('the export action is present on the dashboard', async ({ page }) => {
    await expect(page.getByRole('button', { name: ARIA_EXPORT_EXCEL })).toBeVisible()
  })

  test('exporting produces a real .xlsx file', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: ARIA_EXPORT_EXCEL }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/)

    // Not just "a download happened": a workbook that fails to build can
    // still yield an empty blob. ExcelJS writes a ZIP, so the first two
    // bytes are the local file header magic "PK".
    const path = await download.path()
    const fs = await import('node:fs/promises')
    const bytes = await fs.readFile(path)
    expect(bytes.length).toBeGreaterThan(0)
    expect(bytes.subarray(0, 2).toString()).toBe('PK')
  })

  test('exporting does not error on a store with no sales yet', async ({ page }) => {
    // A fresh store has an empty dashboard, which is the state most likely to
    // divide by zero or index an empty array while building the workbook.
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: ARIA_EXPORT_EXCEL }).click()
    await expect(await downloadPromise).toBeTruthy()

    await expect(page.getByLabel(ARIA_DASHBOARD_DATE)).toBeVisible()
  })
})
