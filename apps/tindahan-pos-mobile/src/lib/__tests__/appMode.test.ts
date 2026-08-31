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

  it("calls the document an order slip, never a receipt or invoice", () => {
    expect(guard.documentTitle).toBe(ALPHA_DOCUMENT_TITLE);
    expect(guard.documentTitle).toBe("ORDER SLIP");
    expect(guard.documentTitle).not.toMatch(/receipt|invoice/i);
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

  it("does not by itself imply BIR accreditation", () => {
    // PRODUCTION only means "not alpha". Whether the store may issue an
    // official invoice is a separate, controlled decision -- nothing
    // here should be read as granting it.
    expect(isAlphaMode("PRODUCTION")).toBe(false);
    expect(guard.documentTitle).toBeNull();
  });
});
