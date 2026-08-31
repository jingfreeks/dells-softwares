# Alpha/Test Print Guardrails — Implementation Record

**Tindahan POS by Dells Software**

> ### This is BIR accreditation *preparation*, not accreditation
>
> Tindahan POS is **not BIR-accredited or registered** for use as an
> accredited POS/invoicing system. Nothing described in this document
> makes it accredited. These are safeguards for the Alpha testing phase,
> so a tester cannot mistake a printed document for an official BIR
> invoice or receipt while accreditation is being pursued separately.
>
> Final compliance must be validated against the applicable BIR/RDO
> requirements, or with a qualified Philippine tax professional. See
> [§5 Compliance](#5-compliance-warning).

| | |
|---|---|
| Status | Implemented and merged |
| Applies to | `apps/tindahan-pos` (web), `apps/tindahan-pos-mobile` (mobile) |
| Pull requests | [#394](https://github.com/jingfreeks/dells-softwares/pull/394) (mobile), [#395](https://github.com/jingfreeks/dells-softwares/pull/395) (web) |
| Default mode | `ALPHA` — including when unconfigured |
| Date | 2026-08-31 |

---

## 1. Code changes

### Where the mode lives

| App | Module | Config source |
|---|---|---|
| Web | `src/lib/appMode/appMode.ts` | `VITE_APP_MODE` |
| Mobile | `src/lib/appMode.ts` | `EXPO_PUBLIC_APP_MODE` |

Both expose the same contract, and both are documented in the app's
`.env.example`. They are deliberately duplicated rather than shared: the
two clients print different artifacts, but they must never disagree about
whether the application is accredited, so the contract is identical.

### Files touched

**Web**

```
src/lib/appMode/                                  new — mode + guardrails
src/components/AlphaModeBadge/                    new — §13 indicator
src/components/Receipt/Receipt.tsx                the transaction document
src/components/Receipt/Receipt.test.tsx           now asserts both modes
src/lib/printReport/printReport.ts                second print pathway
src/pages/Pos/component/receiptmodal/             print action label
src/pages/Settings/component/receiptpreviewpanel/ third surface (see §3)
src/components/ProtectedRoute/ProtectedRoute.tsx  mounts the badge
```

**Mobile**

```
src/lib/appMode.ts                                new — mode + guardrails
src/components/alphamodebadge/                    new — §13 indicator
src/screens/settingsreceiptsscreen/               chip lock + preview
src/screens/posscreen/PosScreen.tsx               badge (cashier-visible)
src/screens/ownerhomescreen/OwnerHomeScreen.tsx   badge
```

No database column, RPC, or transaction path was modified. Per §6 and
§14 the change is confined to the presentation and printing layer: the
register still records transaction id, timestamp, items, quantities,
prices, discounts, customer, cashier, payment method, total, change,
inventory deduction, utang, and audit rows exactly as before.

---

## 2. Print examples

Both captured from the running applications, not mocked up.

### Web — Settings → Receipts preview

```
        *** TEST MODE / TRAINING ONLY ***

                 QA TEST STORE
             Store address not set yet

                   ORDER SLIP

        - - - - - - - - - - - - - - - - -

        000017 · 01 Aug 9:14 AM
        Cashier: Maricel

        - - - - - - - - - - - - - - - - -

        Pancit Canton x3                    54.00
        Skyflakes x2                        18.00
        Globe load 100                     100.00
        Service fee                          5.00

        - - - - - - - - - - - - - - - - -

        TOTAL                              177.00
        Cash                               200.00
        Change                              23.00

        - - - - - - - - - - - - - - - - -

              Salamat po! Balik kayo ulit.

   *** NOT AN OFFICIAL BIR INVOICE/RECEIPT ***
```

### Mobile — Settings → Receipts preview

```
        *** TEST MODE / TRAINING ONLY ***
                   ORDER SLIP
                 QA TEST STORE

        - - - - - - - - - - - - -

        Pancit Canton x3            54.00
        Skyflakes x2                18.00
        Globe load 100             100.00
        Service fee                  5.00

        - - - - - - - - - - - - -

        TOTAL                      177.00
        Cash                       200.00
        Change                      23.00
        Served by: Aling Nena

        - - - - - - - - - - - - -

           Salamat po! Balik kayo ulit.

   *** NOT AN OFFICIAL BIR INVOICE/RECEIPT ***
```

Note the ordering in both: the store's own footer message
("Salamat po!") is printed **above** the mandatory disclaimer. The
operator's copy is never the last word on the page.

### What the web receipt looked like before

Recorded because it is the specific risk this work removes:

```
                 QA TEST STORE
                  Sales Invoice        <- store.invoice_type as heading
        TIN: 123-456-789-000           <- registration identifier
        Permit: BP-2026-001
        ...
        VATable sales              158.04
        VAT amount                  18.96
        This invoice is NOT VAT Registered.   <- calls itself an invoice
```

---

## 3. Architecture explanation

### Where Alpha/Test mode is controlled

One module per app, resolved once at import:

```ts
export function resolveAppMode(raw: string | undefined): AppMode {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "PRODUCTION") return "PRODUCTION";
  return "ALPHA";
}
```

Two properties matter more than the parsing:

- **Unset, unknown, or malformed resolves to `ALPHA`.** Failing open
  would mean printing an unmarked document, so the safe default is the
  most restrictive mode. A misconfigured deploy prints *more* warnings,
  never fewer.
- **`"BIR"` is never honoured.** The type includes a `BIR` member so the
  future state is nameable, but `resolveAppMode` cannot return it.
  Accreditation is a process with the BIR, not an environment variable,
  so a config claiming it is treated as `ALPHA` rather than believed
  (§11, §12).

### Where print generation is centralized

`printGuardrails()` returns what a surface is permitted to render:

```ts
interface PrintDocumentGuardrails {
  testMode: boolean;
  mandatoryHeader: string | null;   // null outside ALPHA
  mandatoryFooter: string | null;
  documentTitle: string | null;     // "ORDER SLIP" in ALPHA
  allowTaxIdentifiers: boolean;     // TIN / permit number
  allowTaxBreakdown: boolean;       // VAT sections
  printActionLabel: string;         // web only
  documentNumberLabel: string | null;
}
```

**The §15 audit found three print surfaces in the web app, not one.**
That mattered:

| # | Surface | Output |
|---|---|---|
| 1 | `Receipt.tsx` via `ReceiptModal` | `window.print()` — browser, A4, thermal, print-to-PDF |
| 2 | `printReport.ts` | `window.open` document — dashboard report modals, supplier scan sheet |
| 3 | `ReceiptPreviewPanel` | Settings → Receipts — a **second, independent receipt implementation** |

Surface 3 was missed by the unit tests and only surfaced when the running
app was loaded: it was still rendering "Sales Invoice" after the other
two were guarded. This is exactly the secondary-path risk §9 warns about,
and it is the reason §15 asks for the audit before the edit. All three
now read the same `printGuardrails()`.

Mobile has **no real print pathway today** — no `window.print`, no
thermal driver. It has the receipt *preview* and mock delivery toggles
("Print on the thermal printer", "Print automatically every sale"), which
persist to AsyncStorage and drive nothing. The preview is guarded so that
whenever a real print path is added it inherits the same source.

### How the watermark is enforced

Three mechanisms, in order of strength:

1. **Not a prop.** Each surface calls `printGuardrails()` itself rather
   than receiving it. There is no argument a caller can omit, and no
   call site that can construct an unmarked document.
2. **Rendered outside the settings-driven region.** The header is emitted
   before the store block; the footer after the operator's own footer
   message. No receipt setting is consulted for either.
3. **Positional guarantees.** The header precedes even the `VOIDED` and
   `REPRINT` markers, so no other conditional block can push it down.

Settings cannot bypass it (§10). The store's existing toggles — logo,
TIN & permit, cashier name, utang balance, QR, custom footer message —
have no path to the disclaimer. The **TIN & permit toggle is locked** in
ALPHA rather than merely ignored: it is disabled in the UI, labelled
"unavailable in test mode", and explained in the card. The setting
survives for later; it just cannot be used to make a test document look
registered.

`allowTaxIdentifiers` is also checked *before* `store.birRegistered`. A
store row may legitimately say it is BIR-registered — the **application**
is what is unaccredited, so identifiers stay off regardless.

### How reprints are protected

`Receipt.tsx` takes `isReprint`, which adds the existing `*** REPRINT ***`
marker. Because the mandatory header is rendered **before** that marker
and the footer after everything, a reprint structurally cannot bypass
either disclaimer. There is one template, so a reprint is the same
component with one extra line — not a separate path (§7).

### How PDF and browser printing are protected

Both apps' web printing goes through the browser: `window.print()` on
the live DOM for the receipt, and `window.open` + a constructed document
for reports. "Save as PDF" is a destination in that same dialog, not a
separate code path, so a PDF is the marked DOM rendered to file. There is
no `jsPDF`/`html2canvas` generator to guard separately — confirmed by the
§15 audit.

### How thermal printing is protected

Thermal output is the same DOM printed to a 58mm/80mm roll through the
browser, so it inherits the guardrails. **Mobile's thermal toggles drive
no implementation today** — see the honest note above. When a real
driver is added, it must render through `Receipt.tsx`/`ReceiptPreview`
rather than formatting its own byte stream, or it becomes a fourth
unmarked surface.

### How future BIR Production Mode can be introduced

```
ALPHA  ──►  PRODUCTION  ──►  (BIR-accredited invoicing)
                 ▲                      ▲
        VITE_APP_MODE=PRODUCTION   NOT reachable by config
```

`PRODUCTION` today means only "not Alpha": the disclaimer stops being
applied automatically and the store's own `invoiceType`, TIN, permit and
VAT sections return. It does **not** mean accredited, and the test suite
asserts that distinction explicitly.

Actual BIR invoicing must be a **separate, controlled configuration**
gated on real accreditation — never a mode an administrator can select.
The `BIR` member exists in the type so that work has a name to attach to;
`resolveAppMode` refusing to return it is the guard that stops it being
switched on prematurely.

No PTU numbers, accreditation numbers, Machine Identification Numbers,
Software Identification Numbers, Acknowledgment Control Numbers, permit
numbers, or serial ranges were invented (§12). When those are required,
they should be added as configuration that stays **disabled until
legitimate values are supplied** through the BIR process.

---

## 4. Test results

`PASS`/`FAIL` per pathway, from the merged suites.

### ALPHA mode

| Pathway | Assertion | Result |
|---|---|---|
| Web receipt | Header disclaimer present | **PASS** |
| Web receipt | Footer disclaimer present | **PASS** |
| Web receipt | Titled `ORDER SLIP`, no "Sales Invoice" | **PASS** |
| Web receipt | TIN/permit withheld despite `birRegistered` | **PASS** |
| Web receipt | No VAT breakdown, no "This invoice…" line | **PASS** |
| Web receipt | Numbered "Order Slip No.", not "Receipt No." | **PASS** |
| Web **reprint** | Both disclaimers retained + `*** REPRINT ***` | **PASS** |
| Web print action | Reads "Print order slip" | **PASS** |
| Web report print | Header + footer applied to second pathway | **PASS** |
| Web settings preview | Same disclaimers, no "Sales Invoice" | **PASS** (verified in running app) |
| Mobile preview | Header + footer disclaimers present | **PASS** |
| Mobile preview | Titled `ORDER SLIP` | **PASS** |
| Mobile settings | TIN & permit chip locked and labelled | **PASS** |
| Both | `BIR` config value refused, resolves to ALPHA | **PASS** |
| Both | Unset/unknown config resolves to ALPHA | **PASS** |

### PRODUCTION mode

| Pathway | Assertion | Result |
|---|---|---|
| Web receipt | Alpha disclaimer **not** auto-applied | **PASS** |
| Web receipt | Store `invoiceType`, TIN, permit render again | **PASS** |
| Web receipt | VAT breakdown renders again | **PASS** |
| Both | PRODUCTION asserted **not** to imply accreditation | **PASS** |

The pre-existing `Receipt` tests encoded the old official-invoice
presentation. Rather than deleting them they were moved under a mocked
`PRODUCTION` mode, so the behaviour needed for a future accredited
document stays covered while the ALPHA block proves the guardrails fire.

### Regression (§17)

| Suite | Result |
|---|---|
| Web — full | **1029 passing / 98 files** |
| Web — guardrail-specific | **39 passing / 2 files** |
| Mobile — full | **275 passing / 36 suites** |
| Mobile — guardrail-specific | **22 passing / 2 suites** |
| Web `tsc --noEmit` | clean |
| Mobile `tsc --noEmit` | clean |

Checkout, payment, inventory deduction, customer credit, sales history,
reports, transaction history, reprint, cashier and admin permissions all
covered by the full suites above and unaffected — the change never
reaches the transaction engine.

---

## 5. Compliance warning

**This work does not make Tindahan POS BIR-compliant.** It prevents an
Alpha tester from mistaking a printed document for an official BIR
invoice or receipt. That is the whole of its scope.

### Must be validated with the BIR/RDO or a qualified Philippine tax professional before any production invoicing is enabled

1. **Accreditation and registration itself.** The application has none.
   No mode, flag, or setting in this codebase substitutes for it.
2. **The production document layout.** What an accredited invoice or
   receipt must contain — mandatory fields, wording, and ordering — has
   not been verified against the applicable BIR requirements. The
   PRODUCTION rendering in this codebase is the *pre-existing* layout,
   not a validated one.
3. **Receipt numbering.** Numbers come from `document_series` and are
   assigned server-side. Whether the series format, reset behaviour, and
   uniqueness guarantees satisfy BIR serial-range rules is unverified.
4. **VAT computation and presentation.** The stored breakdown
   (`vatableSales`, `vatAmount`, `vatExemptSales`, `zeroRatedSales`) is
   preserved for future use and is not asserted to be correct or
   correctly presented for BIR purposes.
5. **Z-reading and reporting.** Existence is not evidence of compliance
   with the required format or retention rules.
6. **Void, refund and audit retention.** Retention periods and required
   reporting have not been checked against BIR rules.
7. **PTU, MIN, SIN, ACN, permit numbers, serial ranges.** None exist and
   none were invented. They must be obtained through the BIR process and
   entered as real values before any document claims them.

### Known gaps in the guardrail itself

- **Mobile has no real print pathway.** The preview is guarded; the
  thermal and auto-print toggles are mock. A future real driver must
  render through the guarded component or it becomes an unmarked
  surface.
- **The mode is a build-time client value.** `VITE_APP_MODE` /
  `EXPO_PUBLIC_APP_MODE` are baked into the bundle, so the guardrail is
  a client-side presentation control. It is not enforced server-side,
  and it is not a security boundary — it is a labelling guarantee for
  documents this application renders.
- **A determined operator can still photograph, screenshot, or
  re-typeset a slip.** No print guardrail can prevent misuse
  downstream; it can only ensure the document the application produces
  is unambiguous.

---

## Appendix — configuration

```bash
# apps/tindahan-pos/.env
VITE_APP_MODE=ALPHA

# apps/tindahan-pos-mobile/.env
EXPO_PUBLIC_APP_MODE=ALPHA
```

Unset, unknown, and `BIR` all resolve to `ALPHA`. Only the exact value
`PRODUCTION` (case-insensitive, trimmed) turns the automatic disclaimer
off — and `PRODUCTION` does not mean BIR-accredited.
