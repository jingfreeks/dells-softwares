import { describe, expect, it, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("./supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { getWarehouseStock, listWarehouses } from "./warehouses";

beforeEach(() => {
  fromMock.mockReset();
});

describe("listWarehouses", () => {
  it("maps snake_case rows to camelCase Warehouse objects, ordered default-first", async () => {
    const rows = [
      {
        id: "wh-1",
        store_id: "store-1",
        name: "Main Store",
        address: null,
        is_default: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    // order() is chained twice (is_default desc, then name asc); the second
    // call resolves the query.
    const secondOrder = vi.fn().mockResolvedValue({ data: rows, error: null });
    const firstOrder = vi.fn(() => ({ order: secondOrder }));
    const eq = vi.fn(() => ({ order: firstOrder }));
    const select = vi.fn(() => ({ eq }));
    fromMock.mockReturnValue({ select });

    const result = await listWarehouses("store-1");

    expect(fromMock).toHaveBeenCalledWith("warehouses");
    expect(eq).toHaveBeenCalledWith("store_id", "store-1");
    expect(result).toEqual([
      {
        id: "wh-1",
        storeId: "store-1",
        name: "Main Store",
        address: null,
        isDefault: true,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);
  });

  it("throws a plain Error when Supabase returns an error", async () => {
    const secondOrder = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const firstOrder = vi.fn(() => ({ order: secondOrder }));
    const eq = vi.fn(() => ({ order: firstOrder }));
    const select = vi.fn(() => ({ eq }));
    fromMock.mockReturnValue({ select });

    await expect(listWarehouses("store-1")).rejects.toThrow("boom");
  });
});

describe("getWarehouseStock", () => {
  it("returns an empty array without querying for the default warehouse", async () => {
    const result = await getWarehouseStock("wh-1", true);
    expect(result).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("maps warehouse_stock rows for a non-default warehouse", async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        {
          id: "ws-1",
          warehouse_id: "wh-2",
          product_id: "prod-1",
          quantity: 5,
          updated_at: "2026-01-02T00:00:00Z",
        },
      ],
      error: null,
    });
    const select = vi.fn(() => ({ eq }));
    fromMock.mockReturnValue({ select });

    const result = await getWarehouseStock("wh-2", false);

    expect(fromMock).toHaveBeenCalledWith("warehouse_stock");
    expect(result).toEqual([
      {
        id: "ws-1",
        warehouseId: "wh-2",
        productId: "prod-1",
        quantity: 5,
        updatedAt: "2026-01-02T00:00:00Z",
      },
    ]);
  });
});
