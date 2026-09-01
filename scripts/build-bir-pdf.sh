#!/usr/bin/env bash
# Builds the BIR documentation PDF, including a table of contents with
# real page numbers.
#
# HTML has no concept of pagination, so the numbers cannot be known until
# the document has been laid out. This renders twice: once with
# placeholders to establish the pagination, then again with the numbers
# read back out of that first render. The placeholder and the real number
# occupy the same line, so the second pass does not reflow.
set -euo pipefail
REPO="${1:-.}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DOCS="$REPO/docs"
PDF="$DOCS/Tindahan_POS_Technical_Documentation.pdf"

render() {
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$PDF" "file://$(cd "$DOCS" && pwd)/_bir-doc.html" >/dev/null 2>&1
}

node "$REPO/scripts/build-bir-pdf-html.mjs" "$REPO" >/dev/null
render                                   # pass 1 — establishes pagination

# Map each section heading to the page it starts on.
node - "$DOCS" <<'NODE'
const fs = require("fs"), path = require("path"), cp = require("child_process");
const docs = process.argv[2];
const pdf = path.join(docs, "Tindahan_POS_Technical_Documentation.pdf");
const html = path.join(docs, "_bir-doc.html");
const pages = Number(cp.execSync(`pdfinfo "${pdf}" | awk '/^Pages/{print $2}'`).toString().trim());
let src = fs.readFileSync(html, "utf8");

// Section titles in document order, taken from the placeholders themselves.
const titles = [...src.matchAll(/<span class="toc-t">([^<]*)<\/span>[\s\S]*?@@(sec-\d+)@@/g)]
  .map((m) => ({ title: m[1], id: m[2] }));

const pageText = [];
for (let p = 1; p <= pages; p++) {
  pageText.push(cp.execSync(`pdftotext -f ${p} -l ${p} "${pdf}" - 2>/dev/null || true`).toString());
}

// Start after the contents page. It lists every section title, so a scan
// beginning at page 1 matches every entry against the TOC itself.
let cursor = pageText.findIndex((t) => /Table of contents/i.test(t.slice(0, 200)));
cursor = cursor === -1 ? 0 : cursor + 1;
for (const { title, id } of titles) {
  // Headings are unique and each starts a new page, so a forward scan
  // from the last match keeps duplicates in the body from stealing a hit.
  const needle = title.replace(/\s+/g, " ").trim().slice(0, 40);
  let found = 0;
  for (let p = cursor; p < pageText.length; p++) {
    const head = pageText[p].replace(/\s+/g, " ").slice(0, 300);
    if (head.includes(needle)) { found = p + 1; cursor = p; break; }
  }
  src = src.replace(`@@${id}@@`, found ? String(found) : "—");
}
fs.writeFileSync(html, src);
console.log(`table of contents: ${titles.length} entries mapped across ${pages} pages`);
NODE

render                                   # pass 2 — with real page numbers
rm -f "$DOCS/_bir-doc.html"
pdfinfo "$PDF" | awk '/^Pages/{print "final PDF: " $2 " pages"}'
