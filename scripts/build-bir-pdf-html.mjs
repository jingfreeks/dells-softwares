/**
 * Renders the same markdown source to a print-styled HTML, which headless
 * Chrome then prints to PDF. Kept separate from the .docx build so both
 * outputs derive from one source of truth rather than from each other.
 */
import fs from "node:fs";
import path from "node:path";

const REPO = process.argv[2];
const SRC = path.join(REPO, "docs/TINDAHAN_POS_TECHNICAL_DOCUMENTATION.md");
const OUT = path.join(REPO, "docs/_bir-doc.html");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

function render(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length && !/^## /.test(lines[i])) i++;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^---+\s*$/.test(line)) { i++; continue; }

    if (/^```/.test(line)) {
      i++; const buf = [];
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre>${esc(buf.join("\n"))}</pre>`);
      continue;
    }

    if (/^\|/.test(line) && /^\|[\s:-]+\|/.test(lines[i + 1] || "")) {
      const buf = [];
      while (i < lines.length && /^\|/.test(lines[i])) buf.push(lines[i++]);
      const cells = (l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(buf[0]);
      const body = buf.slice(2).map(cells);
      out.push(
        `<table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>` +
        body.map((r) => `<tr>${head.map((_, k) => `<td>${inline(r[k] || "")}</td>`).join("")}</tr>`).join("") +
        `</tbody></table>`
      );
      continue;
    }

    if (/^>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      const title = buf.find((l) => /^#+ /.test(l));
      const text = buf.filter((l) => l.trim() && !/^#+ /.test(l)).join(" ");
      out.push(`<div class="callout">${title ? `<p class="ct">${inline(title.replace(/^#+\s*/, ""))}</p>` : ""}<p>${inline(text)}</p></div>`);
      continue;
    }

    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      const lv = h[1].length;
      out.push(`<h${lv} class="${lv === 2 ? "sec" : ""}">${inline(h[2])}</h${lv}>`);
      i++; continue;
    }

    // Lists. A wrapped continuation line (indented, or simply the next
    // non-blank line) belongs to the current item, not to a new paragraph.
    const listItems = (marker) => {
      const items = [];
      while (i < lines.length) {
        const l = lines[i];
        if (marker.test(l)) { items.push(l.replace(marker, "")); i++; continue; }
        if (l.trim() && items.length && !/^[-*]\s+/.test(l) && !/^\d+\.\s/.test(l) &&
            !/^#{2,4}\s/.test(l) && !/^\|/.test(l) && !/^```/.test(l) && !/^>/.test(l) && !/^---+\s*$/.test(l)) {
          items[items.length - 1] += " " + l.trim(); i++; continue;
        }
        break;
      }
      return items;
    };
    if (/^[-*]\s+/.test(line)) {
      const buf = listItems(/^[-*]\s+/);
      out.push(`<ul>${buf.map((b) => `<li>${inline(b)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const buf = listItems(/^\d+\.\s+/);
      out.push(`<ol>${buf.map((b) => `<li>${inline(b)}</li>`).join("")}</ol>`);
      continue;
    }

    const buf = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^[-*]\s+/.test(lines[i]) && !/^\d+\.\s/.test(lines[i]) && !/^#{2,4}\s/.test(lines[i]) &&
      !/^\|/.test(lines[i]) && !/^```/.test(lines[i]) && !/^>/.test(lines[i]) && !/^---+\s*$/.test(lines[i])
    ) buf.push(lines[i++]);
    if (buf.length) out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

const FIGS = {
  1: "web-01-login.png", 2: "web-02-landing.png", 3: "web-03-pos.png",
  4: "web-04-pos-cart.png", 5: "web-05-dashboard.png", 6: "web-06-inventory.png",
  7: "web-07-customers.png", 8: "web-08-reports.png",
  9: "web-09-settings-receipts-order-slip.png", 10: "web-10-audit-log.png",
  11: "web-11-staff.png", 12: "web-12-settings-store.png",
  13: "mobile-01-settings-receipts-order-slip.png",
};

let body = render(fs.readFileSync(SRC, "utf8"));
// Place each captured figure directly beneath its own caption paragraph.
body = body.replace(/<p><strong>Figure (\d+) — ([^<]*)<\/strong>/g, (m, n, title) => {
  const file = FIGS[Number(n)];
  if (!file) return m;
  const cls = file.startsWith("mobile") ? "fig mobile" : "fig";
  return `<figure class="${cls}"><img src="screenshots/${file}" alt="Figure ${n} — ${title}"><figcaption>Figure ${n} — ${title}</figcaption></figure><p><strong>Figure ${n} — ${title}</strong>`;
});

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Tindahan POS — Technical System Documentation</title>
<style>
@page { size: A4; margin: 20mm 18mm 18mm 18mm; }
* { box-sizing: border-box; }
body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1A1A1A; font-size: 9.6pt; line-height: 1.5; margin: 0; }
.cover { height: 245mm; display: flex; flex-direction: column; justify-content: center; text-align: center; page-break-after: always; }
.cover .brand { font-size: 30pt; font-weight: 700; color: #1F4E79; letter-spacing: .02em; }
.cover .sub { font-size: 15pt; margin-top: 6px; }
.cover .rule { border-top: 1px solid #C9CDD3; margin: 18px auto 14px; width: 70%; }
.cover .pitch { font-style: italic; color: #5A5F66; font-size: 10.5pt; }
.cover .org { font-size: 12.5pt; font-weight: 700; margin-top: 34px; }
.cover .meta { color: #5A5F66; margin-top: 6px; font-size: 9.5pt; }
.notice { margin: 42px auto 0; max-width: 150mm; text-align: left; background: #FDF3E3; border-left: 4px solid #D08700; padding: 12px 14px; }
.notice .nt { font-weight: 700; color: #8A5A00; font-size: 9pt; letter-spacing: .06em; margin: 0 0 6px; }
.notice p { margin: 0; font-size: 9pt; }
h2 { font-size: 15pt; color: #1F4E79; margin: 0 0 10px; padding-bottom: 5px; border-bottom: 2px solid #1F4E79; page-break-before: always; page-break-after: avoid; }
h2:first-of-type { page-break-before: avoid; }
h3 { font-size: 11.5pt; color: #1F4E79; margin: 18px 0 6px; page-break-after: avoid; }
h4 { font-size: 10pt; color: #333; margin: 13px 0 5px; page-break-after: avoid; }
p { margin: 0 0 8px; }
ul, ol { margin: 0 0 9px; padding-left: 18px; }
li { margin-bottom: 3px; }
code { font-family: "SF Mono", Consolas, monospace; font-size: 8.6pt; background: #F1F3F6; padding: 1px 4px; border-radius: 3px; }
pre { font-family: "SF Mono", Consolas, monospace; font-size: 7.9pt; background: #F5F6F8; border: 1px solid #E1E5EA; border-radius: 4px; padding: 9px 11px; white-space: pre; overflow-x: hidden; page-break-inside: avoid; margin: 0 0 11px; line-height: 1.35; }
table { width: 100%; border-collapse: collapse; margin: 0 0 12px; font-size: 8.4pt; page-break-inside: avoid; }
th { background: #EDF1F6; text-align: left; font-weight: 700; }
th, td { border: 1px solid #C9CDD3; padding: 4px 6px; vertical-align: top; }
.callout { background: #FDF3E3; border-left: 4px solid #D08700; padding: 10px 12px; margin: 0 0 13px; page-break-inside: avoid; }
.callout .ct { font-weight: 700; color: #8A5A00; margin: 0 0 5px; }
.callout p { margin: 0; font-size: 9pt; }
figure.fig { margin: 10px 0 6px; page-break-inside: avoid; text-align: center; }
figure.fig img { max-width: 100%; max-height: 150mm; border: 1px solid #C9CDD3; border-radius: 3px; }
figure.fig.mobile img { max-height: 175mm; }
figure.fig figcaption { font-size: 8pt; color: #5A5F66; margin-top: 5px; font-style: italic; }
</style></head><body>
<div class="cover">
  <div class="brand">TINDAHAN POS</div>
  <div class="sub">Technical System Documentation</div>
  <div class="rule"></div>
  <div class="pitch">Prepared in support of the BIR accreditation / registration process</div>
  <div class="org">Dells Software</div>
  <div class="meta">Document version 1.0 &nbsp;·&nbsp; Status: DRAFT &nbsp;·&nbsp; 31 August 2026</div>
  <div class="notice">
    <p class="nt">COMPLIANCE NOTICE</p>
    <p>Tindahan POS is currently in ALPHA and is <strong>NOT BIR-accredited</strong>. This document describes the current implementation based on inspected source code and deployed configuration. Documentation of a technical control does not by itself constitute BIR accreditation, certification, approval, or legal compliance. Final compliance status and applicable requirements must be determined through the appropriate BIR process and applicable regulations.</p>
  </div>
</div>
${body}
</body></html>`;

fs.writeFileSync(OUT, html);
console.log("wrote", OUT);
