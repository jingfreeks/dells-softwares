import { jsPDF } from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import { stockStatus } from "./inventory";
import type { DailyReport } from "./reports";

const BRAND: [number, number, number] = [201, 59, 46]; // #c93b2e — matches --color-brand
const INK: [number, number, number] = [30, 41, 59]; // slate-800
const MUTED: [number, number, number] = [100, 116, 139]; // slate-500

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

/**
 * Builds the daily sales report PDF. Kept as a pure function returning a
 * jsPDF instance so callers decide what to do with it — save, print, or
 * hand a Blob to the Web Share API — instead of this module reaching for
 * the DOM itself.
 */
export function buildDailyReportPdf(report: DailyReport, storeName: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(storeName, margin, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Daily Sales Report", margin, 56);
  doc.setFontSize(9);
  doc.text(`Generated ${formatDateTime(report.generatedAt)}`, pageWidth - margin, 56, { align: "right" });

  // Stat cards
  const statY = 104;
  const statH = 58;
  const gap = 12;
  const statW = (pageWidth - margin * 2 - gap * 3) / 4;
  const stats: [string, string][] = [
    ["Today's sales", peso(report.todaysSalesTotal)],
    ["Transactions today", String(report.todaysTransactionCount)],
    ["Low stock", String(report.lowStock.length)],
    ["Total products", String(report.totalProducts)],
  ];
  stats.forEach(([label, value], i) => {
    const x = margin + i * (statW + gap);
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

  let cursorY = statY + statH + 28;

  function sectionTitle(title: string) {
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, margin, cursorY);
    cursorY += 10;
  }

  // Best sellers
  sectionTitle("Best sellers");
  if (report.bestSellers.length > 0) {
    cursorY =
      runTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
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
    doc.text("No sales recorded yet.", margin, cursorY + 4);
    cursorY += 28;
  }

  // Low stock alerts
  sectionTitle("Low stock alerts");
  if (report.lowStock.length > 0) {
    cursorY =
      runTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
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
    doc.text("All products are adequately stocked.", margin, cursorY + 4);
    cursorY += 28;
  }

  // Recent sales
  sectionTitle("Recent sales");
  if (report.recentSales.length > 0) {
    runTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
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
    doc.text("No sales recorded yet.", margin, cursorY + 4);
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(storeName, margin, pageHeight - 20);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: "right" });
  }

  return doc;
}

function reportFileName(report: DailyReport): string {
  const date = new Date(report.generatedAt).toISOString().slice(0, 10);
  return `daily-sales-report-${date}.pdf`;
}

/** Triggers a normal browser download of the report as a PDF file. */
export function downloadDailyReportPdf(report: DailyReport, storeName: string): void {
  buildDailyReportPdf(report, storeName).save(reportFileName(report));
}

/**
 * Opens the system print dialog for the report — the same dialog that
 * offers "Save as PDF" and any physical printer already installed, so
 * one code path covers both "print" and "PDF without downloading first".
 */
export function printDailyReportPdf(report: DailyReport, storeName: string): void {
  const doc = buildDailyReportPdf(report, storeName);
  const blobUrl = doc.output("bloburl") as unknown as string;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = blobUrl;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  };
  // Give the print dialog time to open before tearing the iframe down;
  // the browser keeps its own reference once printing has started.
  setTimeout(() => {
    document.body.removeChild(iframe);
    URL.revokeObjectURL(blobUrl);
  }, 60_000);
}

/**
 * Shares the report via the platform share sheet (Mail, Messages, etc.)
 * when the browser supports sharing files (Web Share API Level 2).
 * Falls back to a plain download so the feature still works everywhere,
 * just without the native share sheet.
 */
export async function shareDailyReportPdf(report: DailyReport, storeName: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const doc = buildDailyReportPdf(report, storeName);
  const blob = doc.output("blob") as Blob;
  const file = new File([blob], reportFileName(report), { type: "application/pdf" });

  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: `${storeName} — Daily Sales Report`,
        text: `Daily sales report for ${storeName}, generated ${formatDateTime(report.generatedAt)}.`,
      });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      throw err;
    }
  }

  doc.save(reportFileName(report));
  return "downloaded";
}
