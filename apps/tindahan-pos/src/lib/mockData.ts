import type { Product, SaleRecord, StaffAccount } from "./types";

export const STORE_NAME = "Dell's Sari-Sari Store";

export const DEMO_ADMIN: StaffAccount = {
  id: "u-admin-1",
  name: "Dell Santos",
  email: "admin@dellsstore.ph",
  role: "admin",
};

export const DEMO_PASSWORD = "admin123";

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "p1",
    barcode: "4801234567890",
    name: "Lola's Chicharon Pork Rinds",
    price: 35,
    stock: 42,
    lowStockThreshold: 10,
    category: "Snacks & Chips",
  },
  {
    id: "p2",
    barcode: "4801234567906",
    name: "Ube Crackers",
    price: 28,
    stock: 8,
    lowStockThreshold: 10,
    category: "Snacks & Chips",
  },
  {
    id: "p3",
    barcode: "4801234567913",
    name: "Corned Beef 150g",
    price: 45,
    stock: 25,
    lowStockThreshold: 8,
    category: "Canned Goods",
  },
  {
    id: "p4",
    barcode: "4801234567920",
    name: "Sardines in Tomato Sauce",
    price: 22,
    stock: 60,
    lowStockThreshold: 15,
    category: "Canned Goods",
  },
  {
    id: "p5",
    barcode: "4801234567937",
    name: "Softdrink 1.5L",
    price: 65,
    stock: 3,
    lowStockThreshold: 5,
    category: "Drinks & Beverages",
  },
  {
    id: "p6",
    barcode: null,
    name: "Shampoo Sachet (Tingi)",
    price: 8,
    stock: 120,
    lowStockThreshold: 20,
    category: "Household Essentials",
  },
  {
    id: "p7",
    barcode: null,
    name: "Load — ₱20 Prepaid",
    price: 20,
    stock: 999,
    lowStockThreshold: 0,
    category: "Load & E-load",
  },
  {
    id: "p8",
    barcode: "4801234567951",
    name: "Rice 1kg",
    price: 58,
    stock: 30,
    lowStockThreshold: 10,
    category: "Rice & Basic Goods",
  },
];

export const INITIAL_SALES: SaleRecord[] = [
  {
    id: "s1",
    timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    items: [
      { productId: "p1", name: "Lola's Chicharon Pork Rinds", quantity: 2, price: 35 },
      { productId: "p4", name: "Sardines in Tomato Sauce", quantity: 3, price: 22 },
    ],
    total: 136,
    cashierName: "Dell Santos",
  },
  {
    id: "s2",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    items: [{ productId: "p5", name: "Softdrink 1.5L", quantity: 1, price: 65 }],
    total: 65,
    cashierName: "Dell Santos",
  },
  {
    id: "s3",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    items: [
      { productId: "p6", name: "Shampoo Sachet (Tingi)", quantity: 4, price: 8 },
      { productId: "p7", name: "Load — ₱20 Prepaid", quantity: 1, price: 20 },
    ],
    total: 52,
    cashierName: "Dell Santos",
  },
];
