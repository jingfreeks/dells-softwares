import { describe, expect, it } from "vitest";
import {
  costChangesWorthKnowing,
  deliveryCount,
  findSimilarSupplierName,
  isoWeekday,
  lastDeliveryDate,
  nextExpectedDelivery,
  supplierDueDate,
  supplierSpend,
  supplierUnpaidTotal,
} from "../suppliers";
import type { ReceivingEntry } from "../../storeData";
import type { Product, Supplier } from "../../types";

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: "sup-1",
    name: "Mega Distribution",
    contactPerson: "Ronnie Cruz",
    phone: "09171234567",
    address: "Quezon City",
    scanCode: "abc123",
    paymentTerms: "cash",
    active: true,
    usualDeliveryDays: [],
    categoryIds: [],
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    barcode: null,
    name: "Sardinas 155g",
    price: 28,
    stock: 20,
    lowStockThreshold: 5,
    categoryId: "cat-1",
    category: "Canned goods",
    packQuantity: null,
    packPrice: null,
    imageUrl: null,
    cost: null,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<ReceivingEntry> = {}): ReceivingEntry {
  return {
    id: "r1",
    date: "2026-07-27",
    supplier: "Mega Distribution",
    supplierId: "sup-1",
    drNumber: null,
    paid: true,
    paidAt: "2026-07-27T10:00:00Z",
    lines: [],
    ...overrides,
  };
}

describe("isoWeekday", () => {
  it("maps Sunday to 7 and Monday to 1", () => {
    expect(isoWeekday(new Date("2026-08-16T00:00:00"))).toBe(7); // Sunday
    expect(isoWeekday(new Date("2026-08-17T00:00:00"))).toBe(1); // Monday
  });
});

describe("nextExpectedDelivery", () => {
  it("returns the next matching day this week", () => {
    // 2026-08-12 is a Wednesday (iso 3)
    const wed = new Date("2026-08-12T00:00:00");
    expect(nextExpectedDelivery([2, 5], wed)).toBe(5); // Friday
  });

  it("wraps to next week when every day this week has passed", () => {
    // 2026-08-15 is a Saturday (iso 6)
    const sat = new Date("2026-08-15T00:00:00");
    expect(nextExpectedDelivery([2], sat)).toBe(2); // next Tuesday
  });

  it("returns null when no delivery days are set", () => {
    expect(nextExpectedDelivery([], new Date())).toBeNull();
  });
});

describe("supplierDueDate", () => {
  it("returns null for cash", () => {
    expect(supplierDueDate("2026-07-27", "cash")).toBeNull();
  });

  it("adds 7 or 15 days for term-based suppliers", () => {
    expect(supplierDueDate("2026-07-27", "7_days")).toBe("2026-08-03");
    expect(supplierDueDate("2026-07-27", "15_days")).toBe("2026-08-11");
  });
});

describe("supplierSpend / deliveryCount / lastDeliveryDate", () => {
  const history: ReceivingEntry[] = [
    makeEntry({ id: "r1", date: "2026-07-01", lines: [{ productId: "p1", productName: "A", quantity: 2, costEach: 10 }] }),
    makeEntry({ id: "r2", date: "2026-07-20", lines: [{ productId: "p1", productName: "A", quantity: 1, costEach: 10 }] }),
    makeEntry({ id: "r3", date: "2026-06-01", supplierId: "sup-2", lines: [{ productId: "p1", productName: "A", quantity: 5, costEach: 10 }] }),
  ];

  it("sums cost for a supplier since a given date, excluding other suppliers", () => {
    expect(supplierSpend(history, "sup-1", "2026-07-01")).toBe(30);
    expect(supplierSpend(history, "sup-2", "2026-07-01")).toBe(0);
  });

  it("counts deliveries since a given date", () => {
    expect(deliveryCount(history, "sup-1", "2026-07-01")).toBe(2);
  });

  it("finds the most recent delivery date", () => {
    expect(lastDeliveryDate(history, "sup-1")).toBe("2026-07-20");
    expect(lastDeliveryDate(history, "sup-nonexistent")).toBeNull();
  });
});

describe("supplierUnpaidTotal", () => {
  it("sums only unpaid entries", () => {
    const history: ReceivingEntry[] = [
      makeEntry({ id: "r1", paid: false, lines: [{ productId: "p1", productName: "A", quantity: 2, costEach: 10 }] }),
      makeEntry({ id: "r2", paid: true, lines: [{ productId: "p1", productName: "A", quantity: 5, costEach: 10 }] }),
    ];
    expect(supplierUnpaidTotal(history, "sup-1")).toBe(20);
  });
});

describe("costChangesWorthKnowing", () => {
  it("detects a real cost change between the two most recent deliveries", () => {
    const history: ReceivingEntry[] = [
      makeEntry({ id: "r1", date: "2026-07-01", lines: [{ productId: "p1", productName: "Sardinas 155g", quantity: 10, costEach: 22 }] }),
      makeEntry({ id: "r2", date: "2026-07-27", lines: [{ productId: "p1", productName: "Sardinas 155g", quantity: 10, costEach: 24 }] }),
    ];
    const rows = costChangesWorthKnowing(history, [makeProduct()], [makeSupplier()]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      productName: "Sardinas 155g",
      supplierName: "Mega Distribution",
      previousCost: 22,
      newCost: 24,
      marginPercent: Math.round(((28 - 24) / 28) * 100),
    });
  });

  it("stays silent when there's only one delivery to compare", () => {
    const history: ReceivingEntry[] = [
      makeEntry({ lines: [{ productId: "p1", productName: "Sardinas 155g", quantity: 10, costEach: 22 }] }),
    ];
    expect(costChangesWorthKnowing(history, [makeProduct()], [makeSupplier()])).toHaveLength(0);
  });

  it("stays silent when cost hasn't actually changed", () => {
    const history: ReceivingEntry[] = [
      makeEntry({ id: "r1", date: "2026-07-01", lines: [{ productId: "p1", productName: "A", quantity: 10, costEach: 22 }] }),
      makeEntry({ id: "r2", date: "2026-07-27", lines: [{ productId: "p1", productName: "A", quantity: 10, costEach: 22 }] }),
    ];
    expect(costChangesWorthKnowing(history, [makeProduct()], [makeSupplier()])).toHaveLength(0);
  });
});

describe("findSimilarSupplierName", () => {
  const suppliers = [makeSupplier({ name: "Mega Distribution" })];

  it("matches case-insensitively", () => {
    expect(findSimilarSupplierName(suppliers, "mega distribution")?.name).toBe("Mega Distribution");
  });

  it("matches a superstring/substring", () => {
    expect(findSimilarSupplierName(suppliers, "Mega Distributions")?.name).toBe("Mega Distribution");
  });

  it("returns null for an unrelated name", () => {
    expect(findSimilarSupplierName(suppliers, "Suki Wholesale")).toBeNull();
  });
});
