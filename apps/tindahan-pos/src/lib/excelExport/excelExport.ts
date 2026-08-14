import ExcelJS from "exceljs";
import { withCategoryPercentages, type BestSeller, type SalesByCategory } from "@/lib/reports";
import type { Customer, SaleRecord } from "@/lib/types";

const CURRENCY_FORMAT = '"₱"#,##0.00';
const DATE_FORMAT = "mmm d, yyyy h:mm AM/PM";
const PERCENT_FORMAT = "0.0%";

export interface RestockExportRow {
  product: string;
  barcode: string | null;
  category: string;
  currentStock: number;
  minStock: number;
  suggestedQuantity: number | null;
  supplier: string | null;
  status: "Out of stock" | "Low stock";
}

export interface DashboardWorkbookData {
  /** The selected reporting day's sales, unflattened — one row per line item is built from these. */
  sales: SaleRecord[];
  customers: Customer[];
  /** Full ranked list, not limited to the dashboard summary card's top 5. */
  bestSellers: BestSeller[];
  categoryTotals: SalesByCategory;
  restockRows: RestockExportRow[];
}

function styleHeaderRow(worksheet: ExcelJS.Worksheet) {
  const header = worksheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  const lastColumn = worksheet.columns.length;
  if (lastColumn > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: lastColumn },
    };
  }
}

function addRecentSalesSheet(workbook: ExcelJS.Workbook, sales: SaleRecord[], customers: Customer[]) {
  const worksheet = workbook.addWorksheet("Recent Sales");
  const customerNameById = new Map(customers.map((c) => [c.id, c.name]));
  worksheet.columns = [
    { header: "Transaction ID", key: "transactionId", width: 14 },
    { header: "Date", key: "date", width: 20, style: { numFmt: DATE_FORMAT } },
    { header: "Cashier", key: "cashier", width: 16 },
    { header: "Customer", key: "customer", width: 18 },
    { header: "Product/Service", key: "item", width: 26 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Unit Price", key: "unitPrice", width: 12, style: { numFmt: CURRENCY_FORMAT } },
    { header: "Subtotal", key: "subtotal", width: 12, style: { numFmt: CURRENCY_FORMAT } },
    { header: "Payment Method", key: "paymentMethod", width: 15 },
    { header: "Total", key: "total", width: 12, style: { numFmt: CURRENCY_FORMAT } },
  ];

  for (const sale of sales) {
    const customerName = sale.customerId ? (customerNameById.get(sale.customerId) ?? "") : "";
    if (sale.items.length === 0) {
      worksheet.addRow({
        transactionId: sale.id.slice(0, 8).toUpperCase(),
        date: new Date(sale.timestamp),
        cashier: sale.cashierName,
        customer: customerName,
        item: "",
        quantity: "",
        unitPrice: "",
        subtotal: "",
        paymentMethod: sale.paymentType,
        total: sale.total,
      });
      continue;
    }
    for (const item of sale.items) {
      worksheet.addRow({
        transactionId: sale.id.slice(0, 8).toUpperCase(),
        date: new Date(sale.timestamp),
        cashier: sale.cashierName,
        customer: customerName,
        item: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: item.lineTotal ?? item.quantity * item.price + item.fee,
        paymentMethod: sale.paymentType,
        total: sale.total,
      });
    }
  }
  styleHeaderRow(worksheet);
}

function addBestSellersSheet(workbook: ExcelJS.Workbook, bestSellers: BestSeller[]) {
  const worksheet = workbook.addWorksheet("Best Sellers");
  worksheet.columns = [
    { header: "Rank", key: "rank", width: 8 },
    { header: "Product", key: "product", width: 28 },
    { header: "SKU/Barcode", key: "barcode", width: 18 },
    { header: "Category", key: "category", width: 18 },
    { header: "Quantity Sold", key: "quantity", width: 14 },
    { header: "Number of Transactions", key: "transactionCount", width: 20 },
    { header: "Total Sales/Revenue", key: "revenue", width: 18, style: { numFmt: CURRENCY_FORMAT } },
  ];
  bestSellers.forEach((b, i) => {
    worksheet.addRow({
      rank: i + 1,
      product: b.name,
      barcode: b.barcode ?? "",
      category: b.category,
      quantity: b.quantity,
      transactionCount: b.transactionCount,
      revenue: b.revenue,
    });
  });
  styleHeaderRow(worksheet);
}

function addSalesByCategorySheet(workbook: ExcelJS.Workbook, categoryTotals: SalesByCategory) {
  const worksheet = workbook.addWorksheet("Sales by Category");
  worksheet.columns = [
    { header: "Category", key: "category", width: 22 },
    { header: "Total Sales", key: "total", width: 15, style: { numFmt: CURRENCY_FORMAT } },
    { header: "Percentage of Total Sales", key: "percent", width: 22, style: { numFmt: PERCENT_FORMAT } },
  ];
  for (const row of withCategoryPercentages(categoryTotals)) {
    worksheet.addRow({ category: row.category, total: row.total, percent: row.percent });
  }
  styleHeaderRow(worksheet);
}

function addNeedsRestockingSheet(workbook: ExcelJS.Workbook, rows: RestockExportRow[]) {
  const worksheet = workbook.addWorksheet("Needs Restocking");
  worksheet.columns = [
    { header: "Product", key: "product", width: 26 },
    { header: "SKU/Barcode", key: "barcode", width: 18 },
    { header: "Category", key: "category", width: 18 },
    { header: "Current Stock", key: "currentStock", width: 14 },
    { header: "Minimum Stock", key: "minStock", width: 14 },
    { header: "Suggested Restock Quantity", key: "suggestedQuantity", width: 22 },
    { header: "Supplier", key: "supplier", width: 20 },
    { header: "Status", key: "status", width: 14 },
  ];
  for (const row of rows) {
    worksheet.addRow({
      product: row.product,
      barcode: row.barcode ?? "",
      category: row.category,
      currentStock: row.currentStock,
      minStock: row.minStock,
      suggestedQuantity: row.suggestedQuantity ?? "",
      supplier: row.supplier ?? "",
      status: row.status,
    });
  }
  styleHeaderRow(worksheet);
}

/**
 * Builds the dashboard's 4-sheet Excel export — the requirements'
 * exact worksheet names/columns, all real data (no fabricated rows).
 */
export function buildDashboardWorkbook(data: DashboardWorkbookData): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tindahan POS";
  workbook.created = new Date();
  addRecentSalesSheet(workbook, data.sales, data.customers);
  addBestSellersSheet(workbook, data.bestSellers);
  addSalesByCategorySheet(workbook, data.categoryTotals);
  addNeedsRestockingSheet(workbook, data.restockRows);
  return workbook;
}

/** Triggers a browser download of the workbook as `filename`, without navigating away from the page. */
export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
