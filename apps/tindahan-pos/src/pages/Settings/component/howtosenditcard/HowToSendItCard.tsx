import {
  LABEL_HOW_TO_SEND_IT,
  LABEL_PRINT_ON_THERMAL_PRINTER,
  LABEL_OFFER_SMS_RECEIPT,
  LABEL_PRINT_AUTOMATICALLY_EVERY_SALE,
  TEXT_RECEIPT_SEND_HINT,
} from "@/lib";

interface HowToSendItCardProps {
  printOnThermal: boolean;
  onTogglePrintOnThermal: () => void;
  offerSmsReceipt: boolean;
  onToggleOfferSmsReceipt: () => void;
  autoPrintEverySale: boolean;
  onToggleAutoPrintEverySale: () => void;
}

export function HowToSendItCard({
  printOnThermal,
  onTogglePrintOnThermal,
  offerSmsReceipt,
  onToggleOfferSmsReceipt,
  autoPrintEverySale,
  onToggleAutoPrintEverySale,
}: HowToSendItCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 11 }}>
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_HOW_TO_SEND_IT}
      </p>

      <div className="tpl-sp" style={{ padding: "5px 0" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_PRINT_ON_THERMAL_PRINTER}</span>
        <button
          type="button"
          role="switch"
          aria-checked={printOnThermal}
          aria-label={LABEL_PRINT_ON_THERMAL_PRINTER}
          onClick={onTogglePrintOnThermal}
          className={`tpl-tog${printOnThermal ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>

      <div className="tpl-sp" style={{ padding: "5px 0" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_OFFER_SMS_RECEIPT}</span>
        <button
          type="button"
          role="switch"
          aria-checked={offerSmsReceipt}
          aria-label={LABEL_OFFER_SMS_RECEIPT}
          onClick={onToggleOfferSmsReceipt}
          className={`tpl-tog${offerSmsReceipt ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>

      <div className="tpl-sp" style={{ padding: "5px 0" }}>
        <span className="tpl-sub">{LABEL_PRINT_AUTOMATICALLY_EVERY_SALE}</span>
        <button
          type="button"
          role="switch"
          aria-checked={autoPrintEverySale}
          aria-label={LABEL_PRINT_AUTOMATICALLY_EVERY_SALE}
          onClick={onToggleAutoPrintEverySale}
          className={`tpl-tog${autoPrintEverySale ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>

      <p className="tpl-hint">{TEXT_RECEIPT_SEND_HINT}</p>
    </div>
  );
}
