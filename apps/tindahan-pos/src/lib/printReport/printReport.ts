import { formatDateTime } from "@/lib";
import { printGuardrails } from "../appMode";

export interface PrintColumn {
  header: string;
  align?: "left" | "right";
}

export interface PrintSummaryTile {
  label: string;
  value: string;
}

export interface PrintReportOptions {
  storeName: string;
  storeAddress?: string | null;
  title: string;
  /** e.g. the selected reporting day, formatted for display. */
  subtitle: string;
  printedByName: string;
  summaryTiles?: PrintSummaryTile[];
  columns: PrintColumn[];
  /** Pre-formatted cell text, one array per row, same order as `columns`. */
  rows: string[][];
  emptyMessage?: string;
  footerNote?: string;
}

const PAPER_TEXT = "#1A1A18";
const PAPER_MUTED = "#5F5E5A";
const PAPER_FAINT = "#8A8880";
const PAPER_BORDER = "#DDD9D0";
const PAPER_HEAD_BG = "#F1EFE8";
const PAPER_HEAD_BORDER = "#C9C5BC";

/**
 * Opens the browser's native print dialog with a clean, paper-styled
 * report — never a fake PDF preview. Builds the whole document via
 * `document.createElement`/`textContent` only (never `innerHTML`), so a
 * store-entered name/value can never be interpreted as markup, matching
 * the pattern already established by Suppliers' scan-sheet printing
 * (`src/pages/Suppliers/hooks.tsx`).
 *
 * `window.open` is called synchronously as the very first statement so
 * this must be invoked directly from a click handler, before any
 * `await` — calling it after an async gap risks the browser's
 * popup blocker silently swallowing it.
 */
export function printReport(options: PrintReportOptions): void {
  const win = window.open("", "_blank");
  if (!win) return;
  const doc = win.document;
  doc.title = `${options.storeName} — ${options.title}`;
  doc.body.style.cssText = `font-family: sans-serif; color: ${PAPER_TEXT}; background: #fff; padding: 44px 46px; max-width: 900px; margin: 0 auto;`;

  const header = doc.createElement("div");
  header.style.cssText = `display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${PAPER_TEXT};padding-bottom:14px;margin-bottom:6px`;

  // §9: this is the app's second print pathway. It produces reports
  // rather than transaction documents, but it must not be a route to an
  // unmarked page while the app is unaccredited.
  const guard = printGuardrails();
  if (guard.mandatoryHeader) {
    const testHeader = doc.createElement("p");
    testHeader.style.cssText = "font-size:12px;font-weight:700;text-align:center;margin-bottom:10px";
    testHeader.textContent = guard.mandatoryHeader;
    doc.body.append(testHeader);
  }

  const storeBlock = doc.createElement("div");
  const storeNameEl = doc.createElement("p");
  storeNameEl.style.cssText = "font-size:19px;font-weight:700;letter-spacing:-.01em";
  storeNameEl.textContent = options.storeName.toUpperCase();
  storeBlock.append(storeNameEl);
  if (options.storeAddress) {
    const addr = doc.createElement("p");
    addr.style.cssText = `font-size:11px;color:${PAPER_MUTED};line-height:1.5`;
    addr.textContent = options.storeAddress;
    storeBlock.append(addr);
  }

  const reportBlock = doc.createElement("div");
  reportBlock.style.cssText = "text-align:right";
  const titleEl = doc.createElement("p");
  titleEl.style.cssText = "font-size:15px;font-weight:700";
  titleEl.textContent = options.title;
  const subtitleEl = doc.createElement("p");
  subtitleEl.style.cssText = `font-size:11px;color:${PAPER_MUTED}`;
  subtitleEl.textContent = options.subtitle;
  const printedEl = doc.createElement("p");
  printedEl.style.cssText = `font-size:10px;color:${PAPER_FAINT};margin-top:4px`;
  const printedAt = formatDateTime(new Date());
  printedEl.textContent = `Printed ${printedAt} by ${options.printedByName}`;
  reportBlock.append(titleEl, subtitleEl, printedEl);

  header.append(storeBlock, reportBlock);
  doc.body.append(header);

  if (options.summaryTiles && options.summaryTiles.length > 0) {
    const summary = doc.createElement("div");
    summary.style.cssText = `display:flex;gap:26px;padding:12px 0 14px;border-bottom:1px solid ${PAPER_BORDER};margin-bottom:14px;flex-wrap:wrap`;
    for (const tile of options.summaryTiles) {
      const box = doc.createElement("div");
      const lbl = doc.createElement("p");
      lbl.style.cssText = `font-size:9.5px;letter-spacing:.7px;color:${PAPER_FAINT}`;
      lbl.textContent = tile.label.toUpperCase();
      const val = doc.createElement("p");
      val.style.cssText = "font-size:19px;font-weight:700";
      val.textContent = tile.value;
      box.append(lbl, val);
      summary.append(box);
    }
    doc.body.append(summary);
  }

  const table = doc.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse";

  const thead = doc.createElement("thead");
  const headRow = doc.createElement("tr");
  headRow.style.cssText = `background:${PAPER_HEAD_BG}`;
  for (const col of options.columns) {
    const th = doc.createElement("th");
    th.style.cssText = `padding:8px;text-align:${col.align ?? "left"};font-size:9.5px;letter-spacing:.6px;color:#44443F;border-bottom:1.5px solid ${PAPER_HEAD_BORDER}`;
    th.textContent = col.header;
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = doc.createElement("tbody");
  if (options.rows.length === 0) {
    const tr = doc.createElement("tr");
    const td = doc.createElement("td");
    td.colSpan = options.columns.length;
    td.style.cssText = `padding:20px 8px;text-align:center;color:${PAPER_FAINT};font-size:12px`;
    td.textContent = options.emptyMessage ?? "No data for this report.";
    tr.append(td);
    tbody.append(tr);
  } else {
    for (const row of options.rows) {
      const tr = doc.createElement("tr");
      row.forEach((cellText, i) => {
        const td = doc.createElement("td");
        const align = options.columns[i]?.align ?? "left";
        td.style.cssText = `padding:7px 8px;border-bottom:1px solid ${PAPER_BORDER};font-size:11px;text-align:${align}`;
        td.textContent = cellText;
        tr.append(td);
      });
      tbody.append(tr);
    }
  }
  table.append(tbody);
  doc.body.append(table);

  const footer = doc.createElement("div");
  footer.style.cssText = `margin-top:26px;padding-top:12px;border-top:1px solid ${PAPER_BORDER};display:flex;justify-content:space-between`;
  const footerNote = doc.createElement("p");
  footerNote.style.cssText = `font-size:10px;color:${PAPER_FAINT}`;
  footerNote.textContent = options.footerNote ?? `Generated by ${options.storeName}'s POS — figures taken from recorded data.`;
  footer.append(footerNote);
  doc.body.append(footer);

  if (guard.mandatoryFooter) {
    const testFooter = doc.createElement("p");
    testFooter.style.cssText = "font-size:12px;font-weight:700;text-align:center;margin-top:14px";
    testFooter.textContent = guard.mandatoryFooter;
    doc.body.append(testFooter);
  }

  win.focus();
  win.print();
}
