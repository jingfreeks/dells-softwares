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
 */
export type AppMode = "ALPHA" | "PRODUCTION" | "BIR";

/**
 * The exact strings §3 requires. Exported so tests assert against the
 * same constant the renderer uses, rather than a copy that could drift.
 */
export const ALPHA_DOCUMENT_HEADER = "*** TEST MODE / TRAINING ONLY ***";
export const ALPHA_DOCUMENT_FOOTER = "*** NOT AN OFFICIAL BIR INVOICE/RECEIPT ***";

/** §4: the document type Alpha output is allowed to call itself. */
export const ALPHA_DOCUMENT_TITLE = "ORDER SLIP";

/** §7: added on top of the disclaimers, never instead of them. */
export const REPRINT_MARKER = "REPRINT";

/** §13: the in-app indicator, so no tester assumes this is an accredited POS. */
export const ALPHA_MODE_BADGE = "ALPHA TEST MODE";

/**
 * Resolves the mode from configuration.
 *
 * Two rules that matter more than the parsing:
 *
 *  - An unset, unknown, or malformed value resolves to ALPHA. Failing
 *    open here would mean printing an unmarked document, so the safe
 *    default is the most restrictive one.
 *  - "BIR" is never honoured. Accreditation cannot be granted by an
 *    environment variable, so a config claiming it is treated as ALPHA
 *    rather than trusted (§11, §12).
 */
export function resolveAppMode(raw: string | undefined): AppMode {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "PRODUCTION") return "PRODUCTION";
  return "ALPHA";
}

export const APP_MODE: AppMode = resolveAppMode(process.env.EXPO_PUBLIC_APP_MODE);

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
  /** The document's own type label. */
  documentTitle: string | null;
  /**
   * §1/§10: in ALPHA the tester must not be able to dress the document
   * up as an official BIR invoice, so registration identifiers are
   * withheld regardless of what the settings say.
   */
  allowTaxIdentifiers: boolean;
  /** §5: VAT breakdowns are an official-invoice presentation. */
  allowTaxBreakdown: boolean;
}

/**
 * The single place print behaviour is decided.
 *
 * User preferences go in; the guardrails are applied *after* them, so a
 * stored setting cannot win. §10's example spreads the preferences first
 * for exactly this reason and this mirrors it -- callers pass their own
 * settings and get back what they are actually permitted to render.
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
  };
}
