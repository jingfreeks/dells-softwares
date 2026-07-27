import { jsPDF } from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import { stockStatus } from "./inventory";
import type { DailyReport } from "./reports";

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
 * Opens the system print dialog for a generated PDF — the same dialog
 * that offers "Save as PDF" and any physical printer already installed,
 * so one code path covers both "print" and "PDF without downloading
 * first". Shared by both the combined report and single-card exports.
 */
function printPdfDoc(doc: jsPDF): void {
  const blobUrl = doc.output("bloburl") as unknown as string;
  // A hidden 0x0 iframe's contentWindow.print() is unreliable across
  // browsers (notably Safari and Firefox silently no-op it). Opening the
  // PDF in its own tab and letting the browser's native PDF viewer show
  // its own print/save controls works everywhere, including when the
  // scripted print() call itself would have been blocked.
  const win = window.open(blobUrl, "_blank");
  if (!win) {
    // Popup blocked — fall back to a normal download so the action still
    // does something instead of silently failing.
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "report.pdf";
    link.click();
    return;
  }
  const tryPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      // Some browsers' built-in PDF viewer blocks scripted print() —
      // the tab is still open with the PDF's own print button available.
    }
  };
  win.addEventListener("load", tryPrint);
  // The PDF viewer's load event doesn't always fire reliably either;
  // this is a best-effort second attempt, not the only path to print.
  setTimeout(tryPrint, 1000);
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
    ["Total products", String(report.totalProducts)],
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

/** Opens the system print dialog for the combined report. */
export function printDailyReportPdf(report: DailyReport, storeName: string): void {
  printPdfDoc(buildDailyReportPdf(report, storeName));
}

export type ShareResult = "shared" | "downloaded" | "cancelled";

/**
 * Shares a generated PDF via the platform share sheet (Mail, Messages,
 * etc.) when the browser supports sharing files (Web Share API Level 2).
 * Falls back to a plain download so sharing still works everywhere,
 * just without the native share sheet. Shared by both the combined
 * report and single-card exports.
 */
async function sharePdfDoc(doc: jsPDF, fileName: string, title: string, text: string): Promise<ShareResult> {
  const blob = doc.output("blob") as Blob;
  const file = new File([blob], fileName, { type: "application/pdf" });

  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title, text });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      throw err;
    }
  }

  doc.save(fileName);
  return "downloaded";
}

/**
 * Shares the combined report via the platform share sheet (Mail,
 * Messages, etc.) when supported. Falls back to a plain download.
 */
export function shareDailyReportPdf(report: DailyReport, storeName: string): Promise<ShareResult> {
  return sharePdfDoc(
    buildDailyReportPdf(report, storeName),
    reportFileName(report),
    `${storeName} — Daily Sales Report`,
    `Daily sales report for ${storeName}, generated ${formatDateTime(report.generatedAt)}.`
  );
}

// ---------------------------------------------------------------------
// Single-card exports — a focused one-section PDF for a single dashboard
// card's print icon, instead of the full combined report.
// ---------------------------------------------------------------------

export interface StatCardSection {
  kind: "stat";
  title: string;
  value: string;
  hint?: string;
}

export interface TableCardSection {
  kind: "table";
  title: string;
  head: string[];
  rows: (string | number)[][];
  emptyMessage: string;
  /** Column index whose "Out of stock"-style value should render in red. */
  dangerColumn?: number;
  dangerValue?: string;
}

export type CardSection = StatCardSection | TableCardSection;

function buildCardSectionPdf(section: CardSection, storeName: string, generatedAt: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const cursorY = drawHeader(doc, storeName, section.title, generatedAt);

  if (section.kind === "stat") {
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    const boxW = pageWidth - MARGIN * 2;
    doc.roundedRect(MARGIN, cursorY, boxW, 80, 6, 6, "FD");
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text(section.title.toUpperCase(), MARGIN + 16, cursorY + 26);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text(section.value, MARGIN + 16, cursorY + 58);
    if (section.hint) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text(section.hint, MARGIN + 16, cursorY + 74);
    }
  } else if (section.rows.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: MARGIN, right: MARGIN },
      head: [section.head],
      body: section.rows,
      theme: "striped",
      headStyles: { fillColor: BRAND },
      styles: { fontSize: 9, cellPadding: 6 },
      didParseCell: (data) => {
        if (
          section.dangerColumn !== undefined &&
          data.section === "body" &&
          data.column.index === section.dangerColumn &&
          data.cell.raw === section.dangerValue
        ) {
          data.cell.styles.textColor = [185, 28, 28]; // red-700
        }
      },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(section.emptyMessage, MARGIN, cursorY + 8);
  }

  drawFooter(doc, storeName);
  return doc;
}

function cardFileName(section: CardSection, generatedAt: string): string {
  return `${slugify(section.title)}-${dateStamp(generatedAt)}.pdf`;
}

/** Downloads a single dashboard card's data as its own focused PDF. */
export function downloadCardSectionPdf(section: CardSection, storeName: string, generatedAt: string): void {
  buildCardSectionPdf(section, storeName, generatedAt).save(cardFileName(section, generatedAt));
}

/** Opens the system print dialog for a single dashboard card. */
export function printCardSectionPdf(section: CardSection, storeName: string, generatedAt: string): void {
  printPdfDoc(buildCardSectionPdf(section, storeName, generatedAt));
}

/** Shares a single dashboard card's PDF via the platform share sheet, falling back to a download. */
export function shareCardSectionPdf(
  section: CardSection,
  storeName: string,
  generatedAt: string
): Promise<ShareResult> {
  return sharePdfDoc(
    buildCardSectionPdf(section, storeName, generatedAt),
    cardFileName(section, generatedAt),
    `${storeName} — ${section.title}`,
    `${section.title} for ${storeName}, generated ${formatDateTime(generatedAt)}.`
  );
}
