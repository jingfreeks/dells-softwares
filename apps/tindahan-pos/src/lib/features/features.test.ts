import { describe, expect, it } from "vitest";
import { navItemsForRole } from "@/lib/nav";

describe("navItemsForRole — features vs permissions", () => {
  const ALL_PERMISSIONS = new Set(["staff.manage", "pos.report.view"]);

  it("hides Customers when the store does not hold utang", () => {
    const items = navItemsForRole("admin", ALL_PERMISSIONS, new Set());
    expect(items.map((i) => i.to)).not.toContain("/customers");
  });

  it("shows it when the store does hold utang", () => {
    const items = navItemsForRole("admin", ALL_PERMISSIONS, new Set(["pos.utang"]));
    expect(items.map((i) => i.to)).toContain("/customers");
  });

  it("does not filter on features when they have not loaded", () => {
    // null means "unknown", not "none". Hiding navigation because a fetch is
    // in flight would flicker the shop's own menu on every sign-in.
    const items = navItemsForRole("admin", ALL_PERMISSIONS, null);
    expect(items.map((i) => i.to)).toContain("/customers");
  });

  it("applies to an OWNER too — a feature is what the store bought", () => {
    // The admin shortcut covers roles and permissions, deliberately not
    // features: an owner cannot use something the tenant does not hold.
    const items = navItemsForRole("admin", ALL_PERMISSIONS, new Set(["pos.eload"]));
    expect(items.map((i) => i.to)).not.toContain("/customers");
  });

  // Review is the exception to the rule above, on purpose. It carries no
  // `feature` key, so it stays visible to a store that has NOT bought it --
  // the approved locked design puts Review in a Starter store's sidebar, and
  // an item that silently vanishes cannot sell anything. The page renders the
  // upgrade state and requests no data; review_summary() is the real boundary.
  it("keeps Review visible to a store without the entitlement, because the locked state is the upsell", () => {
    const items = navItemsForRole("admin", ALL_PERMISSIONS, new Set());
    expect(items.map((i) => i.to)).toContain("/review");
  });

  it("still gates Review on the reporting permission — a cashier does not review the books", () => {
    const items = navItemsForRole("cashier", new Set(), new Set(["pos.review"]));
    expect(items.map((i) => i.to)).not.toContain("/review");
  });

  it("still applies permissions independently of features", () => {
    // A cashier holding no permissions sees neither Staff nor Reports even
    // when the store holds every feature.
    const items = navItemsForRole("cashier", new Set(), new Set(["pos.utang"]));
    const routes = items.map((i) => i.to);
    expect(routes).not.toContain("/staff");
    expect(routes).not.toContain("/reports");
    expect(routes).toContain("/customers");
  });

  it("leaves ungated items alone", () => {
    const items = navItemsForRole("admin", ALL_PERMISSIONS, new Set());
    const routes = items.map((i) => i.to);
    expect(routes).toContain("/pos");
    expect(routes).toContain("/inventory");
  });
});
