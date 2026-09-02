/**
 * Renders docs/TINDAHAN_POS_TECHNICAL_DOCUMENTATION.md into a submission
 * -grade Word document: cover page, document control, table of contents,
 * page numbers, styled tables.
 *
 * The markdown stays the source of truth so the document can be rebuilt
 * whenever the verified facts change.
 */
import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, LevelFormat,
  PageBreak, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TableOfContents,
  ImageRun, TextRun, WidthType,
} from "docx";

const REPO = process.argv[2];
const SRC = path.join(REPO, "docs/TINDAHAN_POS_TECHNICAL_DOCUMENTATION.md");
const OUT = path.join(REPO, "docs/Tindahan_POS_Technical_Documentation.docx");

const INK = "1A1A1A";
const MUTED = "5A5F66";
const ACCENT = "1F4E79";
const RULE = "C9CDD3";
const HEAD_BG = "EDF1F6";
const WARN_BG = "FDF3E3";

const CONTENT_W = 9360; // A4 portrait minus 1" margins, in DXA

const SHOTS = path.join(REPO, "docs/screenshots");
const FIGS = {
  1: "web-01-login.png", 2: "web-02-landing.png", 3: "web-03-pos.png",
  4: "web-04-pos-cart.png", 5: "web-05-dashboard.png", 6: "web-06-inventory.png",
  7: "web-07-customers.png", 8: "web-08-reports.png",
  9: "web-09-settings-receipts-order-slip.png", 10: "web-10-audit-log.png",
  11: "web-11-staff.png", 12: "web-12-settings-store.png",
  13: "mobile-01-settings-receipts-order-slip.png",
};

/** Figure image sized to the text column, preserving aspect ratio. */
function figure(n) {
  const file = FIGS[n];
  if (!file) return [];
  const full = path.join(SHOTS, file);
  if (!fs.existsSync(full)) return [];
  const mobile = file.startsWith("mobile");
  // Captures are 1440x900 (web) and 1179x2556 (mobile device pixels).
  const w = mobile ? 210 : 580;
  const h = mobile ? Math.round((210 * 2556) / 1179) : Math.round((580 * 900) / 1440);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 40 },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(full), transformation: { width: w, height: h } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: `Figure ${n}`, italics: true, size: 16, color: MUTED })],
    }),
  ];
}

/** Inline markdown -> TextRuns. Handles **bold**, `code`, and plain text. */
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(new TextRun({ text: tok.slice(2, -2), bold: true, ...base }));
    } else {
      out.push(new TextRun({ text: tok.slice(1, -1), font: "Consolas", size: 18, ...base }));
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out.length ? out : [new TextRun({ text: "", ...base })];
}

function para(text, opts = {}) {
  const { base = {}, ...rest } = opts;
  return new Paragraph({ children: runs(text, base), spacing: { after: 120 }, ...rest });
}

function splitRow(line) {
  return line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

function buildTable(rows) {
  const header = splitRow(rows[0]);
  const body = rows.slice(2).map(splitRow);
  const n = header.length;
  const colW = Math.floor(CONTENT_W / n);
  const widths = Array(n).fill(colW);
  widths[n - 1] = CONTENT_W - colW * (n - 1);

  const cell = (txt, i, isHead) =>
    new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: isHead ? { type: ShadingType.CLEAR, fill: HEAD_BG, color: "auto" } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [
        new Paragraph({
          spacing: { after: 0 },
          children: runs(txt || "", { size: 18, bold: isHead || undefined, color: INK }),
        }),
      ],
    });

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: RULE },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE },
      left: { style: BorderStyle.SINGLE, size: 4, color: RULE },
      right: { style: BorderStyle.SINGLE, size: 4, color: RULE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: RULE },
    },
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, i, true)) }),
      ...body.map((r) => new TableRow({ children: widths.map((_, i) => cell(r[i], i, false)) })),
    ],
  });
}

function parse(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  // Skip the H1 and the leading disclaimer blockquote — both live on the cover.
  while (i < lines.length && !/^## /.test(lines[i])) i++;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { i++; continue; }

    if (/^---+\s*$/.test(line)) { i++; continue; }

    // fenced code
    if (/^```/.test(line)) {
      i++;
      const buf = [];
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      buf.forEach((l) =>
        out.push(new Paragraph({
          spacing: { after: 0 },
          shading: { type: ShadingType.CLEAR, fill: "F5F6F8", color: "auto" },
          children: [new TextRun({ text: l || " ", font: "Consolas", size: 16, color: INK })],
        }))
      );
      out.push(new Paragraph({ spacing: { after: 140 }, children: [] }));
      continue;
    }

    // table
    if (/^\|/.test(line) && /^\|[\s:-]+\|/.test(lines[i + 1] || "")) {
      const buf = [];
      while (i < lines.length && /^\|/.test(lines[i])) buf.push(lines[i++]);
      out.push(buildTable(buf));
      out.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
      continue;
    }

    // blockquote (callout)
    if (/^>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      const text = buf.filter((l) => l.trim() && !/^#+ /.test(l)).join(" ").replace(/\s+/g, " ");
      const title = buf.find((l) => /^#+ /.test(l));
      if (title) {
        out.push(new Paragraph({
          spacing: { before: 120, after: 40 },
          shading: { type: ShadingType.CLEAR, fill: WARN_BG, color: "auto" },
          children: runs(title.replace(/^#+\s*/, ""), { bold: true, size: 22, color: "8A5A00" }),
        }));
      }
      out.push(new Paragraph({
        spacing: { after: 160 },
        shading: { type: ShadingType.CLEAR, fill: WARN_BG, color: "auto" },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: "D08700", space: 8 } },
        children: runs(text, { size: 19, color: INK }),
      }));
      continue;
    }

    // headings
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push(new Paragraph({
        heading: level === 2 ? HeadingLevel.HEADING_1 : level === 3 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        spacing: { before: level === 2 ? 320 : 220, after: 120 },
        pageBreakBefore: level === 2,
        children: runs(h[2], { color: ACCENT, bold: true, size: level === 2 ? 30 : level === 3 ? 24 : 21 }),
      }));
      i++;
      continue;
    }

    // Lists. A wrapped continuation line belongs to the current item,
    // not to a new paragraph.
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
      listItems(/^[-*]\s+/).forEach((t) =>
        out.push(new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 60 },
          children: runs(t, { size: 20 }),
        }))
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      listItems(/^\d+\.\s+/).forEach((t) =>
        out.push(new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          spacing: { after: 60 },
          children: runs(t, { size: 20 }),
        }))
      );
      continue;
    }

    // paragraph (join wrapped lines)
    const buf = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^[-*]\s+/.test(lines[i]) && !/^\d+\.\s/.test(lines[i]) &&
      !/^#{2,4}\s/.test(lines[i]) && !/^\|/.test(lines[i]) &&
      !/^```/.test(lines[i]) && !/^>/.test(lines[i]) && !/^---+\s*$/.test(lines[i])
    ) buf.push(lines[i++]);
    if (buf.length) {
      const text = buf.join(" ").replace(/\s+/g, " ");
      const fig = text.match(/^\*\*Figure (\d+) —/);
      if (fig) out.push(...figure(Number(fig[1])));
      out.push(para(text, { base: { size: 20, color: INK } }));
    }
  }
  return out;
}

// ---------- cover ----------
const coverLine = (text, o = {}) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: o.after ?? 120 }, children: [new TextRun({ text, ...o })] });

const cover = [
  new Paragraph({ spacing: { after: 1800 }, children: [] }),
  coverLine("TINDAHAN POS", { bold: true, size: 56, color: ACCENT, after: 60 }),
  coverLine("Technical System Documentation", { size: 32, color: INK, after: 240 }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: RULE, space: 10 } },
    children: [new TextRun({ text: "Prepared in support of the BIR accreditation / registration process", size: 22, color: MUTED, italics: true })],
  }),
  coverLine("Dells Software", { bold: true, size: 26, color: INK, after: 60 }),
  coverLine("Document version 1.0  ·  Status: DRAFT  ·  31 August 2026", { size: 20, color: MUTED, after: 1000 }),
  new Paragraph({
    spacing: { after: 100 },
    shading: { type: ShadingType.CLEAR, fill: WARN_BG, color: "auto" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: "D08700", space: 8 } },
    children: [new TextRun({ text: "COMPLIANCE NOTICE", bold: true, size: 20, color: "8A5A00" })],
  }),
  new Paragraph({
    spacing: { after: 400 },
    shading: { type: ShadingType.CLEAR, fill: WARN_BG, color: "auto" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: "D08700", space: 8 } },
    children: [new TextRun({
      text: "Tindahan POS is currently in ALPHA and is NOT BIR-accredited. This document describes the current implementation based on inspected source code and deployed configuration. Documentation of a technical control does not by itself constitute BIR accreditation, certification, approval, or legal compliance. Final compliance status and applicable requirements must be determined through the appropriate BIR process and applicable regulations.",
      size: 19, color: INK,
    })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

const toc = [
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 160 },
    children: [new TextRun({ text: "Table of contents", bold: true, size: 30, color: ACCENT })],
  }),
  // A real TOC field, not a rendered list: Word builds it from the
  // heading styles, so it stays correct when the document is edited to
  // fill in the outstanding values.
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [
      new TextRun({
        text: "If the entries below are blank, select them and press F9 (or right-click and choose \u201cUpdate Field\u201d) to build the contents.",
        size: 17,
        color: MUTED,
        italics: true,
      }),
    ],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

const md = fs.readFileSync(SRC, "utf8");
const body = parse(md);

const doc = new Document({
  creator: "Dells Software",
  title: "Tindahan POS — Technical System Documentation",
  description: "Technical documentation prepared in support of the BIR accreditation process",
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 240 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 240 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: "Calibri", size: 20, color: INK } } },
  },
  features: { updateFields: true },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 6 } },
          children: [new TextRun({ text: "Tindahan POS — Technical System Documentation", size: 16, color: MUTED })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Dells Software  ·  DRAFT  ·  Page ", size: 16, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED }),
            new TextRun({ text: " of ", size: 16, color: MUTED }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTED }),
          ],
        })],
      }),
    },
    children: [...cover, ...toc, ...body],
  }],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buf);
console.log("wrote", OUT, (buf.length / 1024).toFixed(0) + "KB");
