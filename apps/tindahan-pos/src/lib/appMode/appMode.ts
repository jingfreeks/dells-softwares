/**
 * Which invoicing regime the app is running under.
 *
 * Tindahan POS is in Alpha and is NOT BIR-accredited. Nothing in this
 * file makes it accredited -- it exists so a document printed during
 * testing can never be mistaken for an official BIR invoice or receipt.
 *
 * Deliberately three states, not a boolean:
 *
 *   ALPHA       - testing. Every generated document carries the
 *                 test-mode disclaimer, and no setting can remove it.
 *   PRODUCTION  - real operation, still NOT BIR-accredited. The alpha
 *                 disclaimer stops being applied automatically.
 *   BIR         - reserved. Not reachable yet, and deliberately not
 *                 selectable by an administrator: accreditation is a
 *                 process with the BIR, not a switch in a settings
 *                 screen. `resolveAppMode` refuses to resolve to it.
 *
 * Kept byte-identical in intent to the mobile app's src/lib/appMode.ts.
 * The two clients print different artifacts but must never disagree
 * about whether the app is accredited.
 */
export type AppMode = "ALPHA" | "PRODUCTION" | "BIR";

/** The exact strings §3 requires, exported so tests assert the same constant the renderer uses. */
export const ALPHA_DOCUMENT_HEADER = "*** TEST MODE / TRAINING ONLY ***";
export const ALPHA_DOCUMENT_FOOTER = "*** NOT AN OFFICIAL BIR INVOICE/RECEIPT ***";

/** §4: the document type Alpha output is allowed to call itself. */
export const ALPHA_DOCUMENT_TITLE = "ORDER SLIP";

/**
 * §2: what the print action is called. "Print receipt" implies an
 * official document; an Alpha build prints an order slip and says so.
 */
export const ALPHA_PRINT_ACTION = "Print order slip";
export const DEFAULT_PRINT_ACTION = "Print receipt";

/** §2: "Receipt No." implies an official series. An order slip has a slip number. */
export const ALPHA_DOCUMENT_NUMBER_LABEL = "Order Slip No.";

/** §13: the in-app indicator, so no tester assumes this is an accredited POS. */
export const ALPHA_MODE_BADGE = "ALPHA TEST MODE";

/**
 * Resolves the mode from configuration.
 *
 *  - An unset, unknown, or malformed value resolves to ALPHA. Failing
 *    open would mean printing an unmarked document, so the safe default
 *    is the most restrictive one.
 *  - "BIR" is never honoured. Accreditation cannot be granted by an
 *    environment variable, so a config claiming it is treated as ALPHA
 *    rather than trusted (§11, §12).
 */
export function resolveAppMode(raw: string | undefined): AppMode {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "PRODUCTION") return "PRODUCTION";
  return "ALPHA";
}

export const APP_MODE: AppMode = resolveAppMode(import.meta.env.VITE_APP_MODE as string | undefined);

export function isAlphaMode(mode: AppMode = APP_MODE): boolean {
  return mode === "ALPHA";
}

/** What a print/preview surface is allowed to render. */
export interface PrintDocumentGuardrails {
  testMode: boolean;
  /** Non-null only in ALPHA. Rendered at the very top, before anything else. */
  mandatoryHeader: string | null;
  /** Non-null only in ALPHA. Rendered at the very bottom, after everything else. */
  mandatoryFooter: string | null;
  /**
   * What the document calls itself. In ALPHA this replaces the store's
   * own `invoiceType` ("Sales Invoice"), which would otherwise announce
   * the page as an official invoice.
   */
  documentTitle: string | null;
  /** §1/§10: registration identifiers (TIN, permit no.) are withheld in ALPHA. */
  allowTaxIdentifiers: boolean;
  /** §5: VAT breakdowns are an official-invoice presentation. */
  allowTaxBreakdown: boolean;
  /** §2: label for the button/menu item that triggers printing. */
  printActionLabel: string;
  /** §2: null keeps the caller's own "Receipt No." wording. */
  documentNumberLabel: string | null;
}

/**
 * The single place print behaviour is decided.
 *
 * User preferences are applied by the caller; these guardrails are
 * applied *after* them, so a stored receipt setting cannot win.
 */
export function printGuardrails(mode: AppMode = APP_MODE): PrintDocumentGuardrails {
  const alpha = isAlphaMode(mode);
  return {
    testMode: alpha,
    mandatoryHeader: alpha ? ALPHA_DOCUMENT_HEADER : null,
    mandatoryFooter: alpha ? ALPHA_DOCUMENT_FOOTER : null,
    documentTitle: alpha ? ALPHA_DOCUMENT_TITLE : null,
    allowTaxIdentifiers: !alpha,
    allowTaxBreakdown: !alpha,
    printActionLabel: alpha ? ALPHA_PRINT_ACTION : DEFAULT_PRINT_ACTION,
    documentNumberLabel: alpha ? ALPHA_DOCUMENT_NUMBER_LABEL : null,
  };
}
