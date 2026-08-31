/**
 * Captures the screenshot evidence required by the BIR documentation
 * package (Screenshots, User Flows & Operating Procedures §1–§3, §20).
 *
 * These are real captures of the running application, driven through the
 * same helpers the functional e2e suite uses — the specification forbids
 * mock-ups, stock images, or fabricated screens, and requires that the
 * evidence match the version being documented. Re-running this file
 * regenerates the whole set against whatever is currently built.
 *
 * Not part of the functional suite: it asserts nothing about behaviour,
 * it only records it. Run explicitly:
 *   npx playwright test e2e/capture-screenshots.spec.ts --project=chromium
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";


const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, "../../../docs/screenshots");

// One store is set up once and reused, so the figures tell a single
// coherent story rather than showing eight unrelated empty stores.
test.describe.configure({ mode: "serial" });

let email = "";

async function shot(page: Page, name: string) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: false });
}

test("capture web evidence", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // Credentials come from the environment, never from source (§20:
  // screenshots and evidence must not expose credentials).
  const email = process.env.DOC_EMAIL;
  const password = process.env.DOC_PASSWORD;
  test.skip(!email || !password, "DOC_EMAIL / DOC_PASSWORD not set");

  // Fig 1 — Login (unauthenticated)
  await page.goto("/login");
  await page.waitForTimeout(900);
  await shot(page, "web-01-login");

  // Fig 2 — Landing page
  await page.goto("/");
  await page.waitForTimeout(1400);
  await shot(page, "web-02-landing");

  // Inlined rather than reusing the e2e login helper: that helper asserts
  // a redirect to /pos, which is the cashier landing. An onboarded admin
  // lands on /admin, so the shared post-condition does not apply here.
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /sign in/i }).last().click();
  await page.waitForURL(/\/(admin|pos)/, { timeout: 30_000 });
  await page.waitForTimeout(2000);

  // Fig 3 — POS / register. Navigated explicitly: an onboarded admin
  // lands on /admin after sign-in, not on the register.
  await page.goto("/pos");
  await page.waitForTimeout(2500);
  await shot(page, "web-03-pos");

  // Fig 4 — POS with a cart built from the store's real catalogue
  const tiles = page.locator("button", { hasText: /₱/ });
  await page.waitForTimeout(500);
  const n = await tiles.count().catch(() => 0);
  if (n > 0) {
    await tiles.nth(0).click().catch(() => {});
    await page.waitForTimeout(300);
    await tiles.nth(0).click().catch(() => {});
    if (n > 1) await tiles.nth(1).click().catch(() => {});
  }
  await page.waitForTimeout(900);
  await shot(page, "web-04-pos-cart");

  const pages: Array<[string, string, number]> = [
    ["/admin", "web-05-dashboard", 2500],
    ["/inventory", "web-06-inventory", 2000],
    ["/customers", "web-07-customers", 2000],
    ["/reports", "web-08-reports", 3000],
    ["/settings/receipts", "web-09-settings-receipts-order-slip", 2200],
    ["/settings/audit-log", "web-10-audit-log", 2200],
    ["/staff", "web-11-staff", 2200],
    ["/settings/store", "web-12-settings-store", 2000],
  ];
  for (const [route, name, wait] of pages) {
    await page.goto(route);
    await page.waitForTimeout(wait);
    await shot(page, name);
  }
  expect(true).toBe(true);
});
