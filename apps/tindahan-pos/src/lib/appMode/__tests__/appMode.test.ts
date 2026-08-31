import { describe, expect, it } from "vitest";
import {
  ALPHA_DOCUMENT_FOOTER,
  ALPHA_DOCUMENT_HEADER,
  ALPHA_DOCUMENT_TITLE,
  isAlphaMode,
  printGuardrails,
  resolveAppMode,
} from "../appMode";

describe("resolveAppMode", () => {
  it("resolves an explicit PRODUCTION value", () => {
    expect(resolveAppMode("PRODUCTION")).toBe("PRODUCTION");
    expect(resolveAppMode("  production  ")).toBe("PRODUCTION");
  });

  it("falls back to ALPHA when unset or unrecognised", () => {
    // Failing open would mean printing an unmarked document, so the
    // safe default has to be the most restrictive mode.
    expect(resolveAppMode(undefined)).toBe("ALPHA");
    expect(resolveAppMode("")).toBe("ALPHA");
    expect(resolveAppMode("staging")).toBe("ALPHA");
  });

  it("refuses to resolve to BIR from configuration", () => {
    // Accreditation is a process with the BIR, not an env var. A config
    // claiming it must not be believed (§11, §12).
    expect(resolveAppMode("BIR")).toBe("ALPHA");
    expect(resolveAppMode("bir")).toBe("ALPHA");
  });
});

describe("printGuardrails in ALPHA", () => {
  const guard = printGuardrails("ALPHA");

  it("carries both mandatory disclaimers verbatim", () => {
    expect(guard.mandatoryHeader).toBe("*** TEST MODE / TRAINING ONLY ***");
    expect(guard.mandatoryFooter).toBe("*** NOT AN OFFICIAL BIR INVOICE/RECEIPT ***");
    expect(guard.mandatoryHeader).toBe(ALPHA_DOCUMENT_HEADER);
    expect(guard.mandatoryFooter).toBe(ALPHA_DOCUMENT_FOOTER);
  });

  it("replaces the store's own invoice type with a neutral title", () => {
    // stores.invoice_type is "Sales Invoice" in the database -- printing
    // it would announce an unaccredited document as an official one.
    expect(guard.documentTitle).toBe(ALPHA_DOCUMENT_TITLE);
    expect(guard.documentTitle).toBe("ORDER SLIP");
    expect(guard.documentTitle).not.toMatch(/receipt|invoice/i);
  });

  it("renames the print action and the document number away from 'receipt'", () => {
    expect(guard.printActionLabel).toBe("Print order slip");
    expect(guard.printActionLabel).not.toMatch(/receipt|invoice/i);
    expect(guard.documentNumberLabel).toBe("Order Slip No.");
  });

  it("withholds tax identifiers and VAT breakdowns", () => {
    expect(guard.allowTaxIdentifiers).toBe(false);
    expect(guard.allowTaxBreakdown).toBe(false);
  });

  it("reports test mode", () => {
    expect(guard.testMode).toBe(true);
    expect(isAlphaMode("ALPHA")).toBe(true);
  });
});

describe("printGuardrails outside ALPHA", () => {
  const guard = printGuardrails("PRODUCTION");

  it("stops applying the alpha disclaimer automatically", () => {
    expect(guard.mandatoryHeader).toBeNull();
    expect(guard.mandatoryFooter).toBeNull();
    expect(guard.testMode).toBe(false);
  });

  it("hands wording back to the caller rather than overriding it", () => {
    expect(guard.documentTitle).toBeNull();
    expect(guard.documentNumberLabel).toBeNull();
    expect(guard.printActionLabel).toBe("Print receipt");
  });

  it("does not by itself imply BIR accreditation", () => {
    // PRODUCTION only means "not alpha". Whether the store may issue an
    // official invoice is a separate, controlled decision.
    expect(isAlphaMode("PRODUCTION")).toBe(false);
  });
});
