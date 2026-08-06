import { jsPDF } from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import { stockStatus } from "@/lib/inventory";
import type { DailyReport } from "@/lib/reports";

const BRAND: [number, number, number] = [201, 59, 46]; // #c93b2e — matches --color-brand
const INK: [number, number, number] = [30, 41, 59]; // slate-800
const MUTED: [number, number, number] = [100, 116, 139]; // slate-500
const MARGIN = 40;

/**
 * jspdf-autotable v5 dropped `doc.lastAutoTable` — the supported way to
 * find where a table ended is to read the cursor position from the
 * didDrawPage hook, which fires once per page the table spans and holds
 * the final y position after its last invocation.
 */
function runTable(doc: jsPDF, options: UserOptions): number {
  let finalY = typeof options.startY === "number" ? options.startY : 0;
  autoTable(doc, {
    ...options,
    didDrawPage: (data) => {
      if (data.cursor) finalY = data.cursor.y;
    },
  });
  return finalY;
}

/**
 * jsPDF's built-in fonts use WinAnsi encoding, which doesn't include the
 * peso sign (U+20B1) — it renders as a blank box. "P" reads unambiguously
 * as pesos in this context and avoids embedding a custom font just for
 * one glyph.
 */
function peso(amount: number): string {
  return `P ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateStamp(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Draws the shared brand header band and returns the y position to start content at. */
function drawHeader(doc: jsPDF, storeName: string, subtitle: string, generatedAt: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(storeName, MARGIN, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(subtitle, MARGIN, 56);
  doc.setFontSize(9);
  doc.text(`Generated ${formatDateTime(generatedAt)}`, pageWidth - MARGIN, 56, { align: "right" });
  return 104;
}

/** Draws "<store name>  ·  Page X of Y" on every page of the document. */
function drawFooter(doc: jsPDF, storeName: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(storeName, MARGIN, pageHeight - 20);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 20, { align: "right" });
  }
}

/**
 * Builds the daily sales report PDF. Kept as a pure function returning a
 * jsPDF instance so callers decide what to do with it instead of this
 * module reaching for the DOM itself.
 */
export function buildDailyReportPdf(report: DailyReport, storeName: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = drawHeader(doc, storeName, "Daily Sales Report", report.generatedAt);

  // Stat cards
  const statY = cursorY;
  const statH = 58;
  const gap = 12;
  const statW = (pageWidth - MARGIN * 2 - gap * 3) / 4;
  const stats: [string, string][] = [
    ["Today's sales", peso(report.todaysSalesTotal)],
    ["Transactions today", String(report.todaysTransactionCount)],
    ["Low stock", String(report.lowStock.length)],
    ["Utang outstanding", peso(report.utangOutstanding)],
  ];
  stats.forEach(([label, value], i) => {
    const x = MARGIN + i * (statW + gap);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(x, statY, statW, statH, 4, 4, "FD");
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), x + 10, statY + 20, { maxWidth: statW - 20 });
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(value, x + 10, statY + 42);
    doc.setFont("helvetica", "normal");
  });

  cursorY = statY + statH + 28;

  function sectionTitle(title: string) {
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, MARGIN, cursorY);
    cursorY += 10;
  }

  // Best sellers
  sectionTitle("Best sellers");
  if (report.bestSellers.length > 0) {
    cursorY =
      runTable(doc, {
        startY: cursorY,
        margin: { left: MARGIN, right: MARGIN },
        head: [["#", "Product", "Units sold"]],
        body: report.bestSellers.map((item, i) => [String(i + 1), item.name, String(item.quantity)]),
        theme: "striped",
        headStyles: { fillColor: BRAND },
        styles: { fontSize: 9, cellPadding: 6 },
        columnStyles: { 0: { cellWidth: 24 }, 2: { halign: "right", cellWidth: 80 } },
      }) + 24;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No sales recorded yet.", MARGIN, cursorY + 4);
    cursorY += 28;
  }

  // Low stock alerts
  sectionTitle("Low stock alerts");
  if (report.lowStock.length > 0) {
    cursorY =
      runTable(doc, {
        startY: cursorY,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Product", "Category", "Stock", "Threshold", "Status"]],
        body: report.lowStock.map((p) => [
          p.name,
          p.category,
          String(p.stock),
          String(p.lowStockThreshold),
          stockStatus(p) === "out" ? "Out of stock" : "Low stock",
        ]),
        theme: "striped",
        headStyles: { fillColor: BRAND },
        styles: { fontSize: 9, cellPadding: 6 },
        columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 4 && data.cell.raw === "Out of stock") {
            data.cell.styles.textColor = [185, 28, 28]; // red-700
          }
        },
      }) + 24;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("All products are adequately stocked.", MARGIN, cursorY + 4);
    cursorY += 28;
  }

  // Restock suggestions
  sectionTitle("Restock suggestions");
  if (report.restockSuggestions.length > 0) {
    cursorY =
      runTable(doc, {
        startY: cursorY,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Product", "Avg. sold/day", "Days of stock left", "Suggested qty"]],
        body: report.restockSuggestions.map((s) => [
          s.productName,
          String(s.avgDailySales),
          String(s.daysOfStockLeft),
          String(s.suggestedQuantity),
        ]),
        theme: "striped",
        headStyles: { fillColor: BRAND },
        styles: { fontSize: 9, cellPadding: 6 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      }) + 24;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Nothing needs restocking right now.", MARGIN, cursorY + 4);
    cursorY += 28;
  }

  // Sales by category
  sectionTitle("Sales by category");
  if (report.categoryTotals.rows.length > 0) {
    cursorY =
      runTable(doc, {
        startY: cursorY,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Category", "Total"]],
        body: report.categoryTotals.rows.map((row) => [row.category, peso(row.total)]),
        theme: "striped",
        headStyles: { fillColor: BRAND },
        styles: { fontSize: 9, cellPadding: 6 },
        columnStyles: { 1: { halign: "right" } },
      }) + 24;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No data yet.", MARGIN, cursorY + 4);
    cursorY += 28;
  }

  // Recent sales
  sectionTitle("Recent sales");
  if (report.recentSales.length > 0) {
    runTable(doc, {
      startY: cursorY,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Date & time", "Cashier", "Items", "Total"]],
      body: report.recentSales.map((sale) => [
        formatDateTime(sale.timestamp),
        sale.cashierName,
        String(sale.items.length),
        peso(sale.total),
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND },
      styles: { fontSize: 9, cellPadding: 6 },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No sales recorded yet.", MARGIN, cursorY + 4);
  }

  drawFooter(doc, storeName);
  return doc;
}

function reportFileName(report: DailyReport): string {
  return `daily-sales-report-${dateStamp(report.generatedAt)}.pdf`;
}

/** Triggers a normal browser download of the report as a PDF file. */
export function downloadDailyReportPdf(report: DailyReport, storeName: string): void {
  buildDailyReportPdf(report, storeName).save(reportFileName(report));
}
