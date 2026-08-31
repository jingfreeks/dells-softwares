# Documentation

| File | Purpose |
|---|---|
| `TINDAHAN_POS_TECHNICAL_DOCUMENTATION.md` | **Source of truth.** Technical system documentation for the BIR accreditation process. |
| `Tindahan_POS_Technical_Documentation.docx` | Word rendering, for editing and completing before submission. |
| `Tindahan_POS_Technical_Documentation.pdf` | PDF rendering (A4), for submission. |

## Rebuilding the documents

Edit the **markdown**, never the `.docx` or `.pdf` — both are generated
and will be overwritten.

```bash
# Word
npm --prefix /tmp/docx-build install docx   # once, if `docx` is unavailable
node scripts/build-bir-docx.mjs .

# PDF (renders a print-styled HTML, then prints it with headless Chrome)
node scripts/build-bir-pdf-html.mjs .
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="docs/Tindahan_POS_Technical_Documentation.pdf" \
  "file://$PWD/docs/_bir-doc.html"
rm docs/_bir-doc.html
```

## Before submitting

The document deliberately marks what could not be verified. These need a
human before it goes to the BIR:

- Technical and business contact details
- Company registration / TIN
- Prepared by / Reviewed by / Approved by names
- A real software version — both apps currently read `0.0.0`
- Mobile distribution and monitoring configuration

Open the `.docx`, update the table of contents field (right-click →
Update Field), and complete the `[TO BE VERIFIED]` entries.
