import {
  LABEL_WHAT_TO_INCLUDE,
  LABEL_INCLUDE_LOGO,
  LABEL_INCLUDE_TIN_AND_PERMIT,
  LABEL_INCLUDE_CASHIER_NAME,
  LABEL_INCLUDE_UTANG_BALANCE,
  LABEL_INCLUDE_QR_TO_PAY,
} from "@/lib";

interface WhatToIncludeCardProps {
  includeLogo: boolean;
  onToggleIncludeLogo: () => void;
  includeTinAndPermit: boolean;
  onToggleIncludeTinAndPermit: () => void;
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
  includeCashierName,
  onToggleIncludeCashierName,
  includeUtangBalance,
  onToggleIncludeUtangBalance,
  includeQrToPay,
  onToggleIncludeQrToPay,
}: WhatToIncludeCardProps) {
  const chips: { label: string; on: boolean; onToggle: () => void }[] = [
    { label: LABEL_INCLUDE_LOGO, on: includeLogo, onToggle: onToggleIncludeLogo },
    { label: LABEL_INCLUDE_TIN_AND_PERMIT, on: includeTinAndPermit, onToggle: onToggleIncludeTinAndPermit },
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
            onClick={chip.onToggle}
            className={`tpl-chip${chip.on ? " tpl-on" : ""}`}
            style={{ cursor: "pointer", font: "inherit" }}
          >
            {chip.on && <i className="ti ti-check" aria-hidden />}
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
