import {
  LABEL_WHAT_TO_INCLUDE,
  LABEL_INCLUDE_LOGO,
  LABEL_INCLUDE_TIN_AND_PERMIT,
  LABEL_INCLUDE_CASHIER_NAME,
  LABEL_INCLUDE_UTANG_BALANCE,
  LABEL_INCLUDE_QR_TO_PAY,
  TEXT_TIN_REQUIRED_HINT,
  TEXT_TIN_WITHHELD_ALPHA_HINT,
} from "@/lib";
import { printGuardrails } from "@/lib/appMode";

interface WhatToIncludeCardProps {
  includeLogo: boolean;
  onToggleIncludeLogo: () => void;
  includeTinAndPermit: boolean;
  onToggleIncludeTinAndPermit: () => void;
  /** A BIR-registered store always prints its TIN — the toggle can't turn that off. */
  birRegistered: boolean;
  includeCashierName: boolean;
  onToggleIncludeCashierName: () => void;
  includeUtangBalance: boolean;
  onToggleIncludeUtangBalance: () => void;
  includeQrToPay: boolean;
  onToggleIncludeQrToPay: () => void;
}

export function WhatToIncludeCard({
  includeLogo,
  onToggleIncludeLogo,
  includeTinAndPermit,
  onToggleIncludeTinAndPermit,
  birRegistered,
  includeCashierName,
  onToggleIncludeCashierName,
  includeUtangBalance,
  onToggleIncludeUtangBalance,
  includeQrToPay,
  onToggleIncludeQrToPay,
}: WhatToIncludeCardProps) {
  // In ALPHA the print layer withholds TIN and permit regardless of this
  // setting, so the chip must not claim otherwise -- a control that says
  // it is on while nothing prints is worse than one that is plainly off.
  const guard = printGuardrails();
  const tinWithheld = !guard.allowTaxIdentifiers;

  const chips: { label: string; on: boolean; onToggle: () => void; locked?: boolean }[] = [
    { label: LABEL_INCLUDE_LOGO, on: includeLogo, onToggle: onToggleIncludeLogo },
    {
      label: LABEL_INCLUDE_TIN_AND_PERMIT,
      on: !tinWithheld && (birRegistered || includeTinAndPermit),
      onToggle: onToggleIncludeTinAndPermit,
      locked: tinWithheld || birRegistered,
    },
    { label: LABEL_INCLUDE_CASHIER_NAME, on: includeCashierName, onToggle: onToggleIncludeCashierName },
    { label: LABEL_INCLUDE_UTANG_BALANCE, on: includeUtangBalance, onToggle: onToggleIncludeUtangBalance },
    { label: LABEL_INCLUDE_QR_TO_PAY, on: includeQrToPay, onToggle: onToggleIncludeQrToPay },
  ];

  return (
    <div className="tpl-card" style={{ marginBottom: 11 }}>
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_WHAT_TO_INCLUDE}
      </p>
      <div className="tpl-row" style={{ gap: 6, flexWrap: "wrap" }}>
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            aria-pressed={chip.on}
            aria-disabled={chip.locked}
            onClick={chip.locked ? undefined : chip.onToggle}
            className={`tpl-chip${chip.on ? " tpl-on" : ""}`}
            style={{ cursor: chip.locked ? "default" : "pointer", font: "inherit" }}
          >
            {chip.on && <i className="ti ti-check" aria-hidden />}
            {chip.label}
          </button>
        ))}
      </div>
      {tinWithheld ? (
        <p className="tpl-hint" style={{ marginTop: 8 }}>
          {TEXT_TIN_WITHHELD_ALPHA_HINT}
        </p>
      ) : birRegistered ? (
        <p className="tpl-hint" style={{ marginTop: 8 }}>
          {TEXT_TIN_REQUIRED_HINT}
        </p>
      ) : null}
    </div>
  );
}
