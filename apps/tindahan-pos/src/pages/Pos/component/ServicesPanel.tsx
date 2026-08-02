import { selectOnFocus, LABEL_AMOUNT_PESO, LABEL_FEE_PESO, BUTTON_ADD_TO_CART } from "@/lib";
import { SERVICE_TYPES } from "../hooks";
import { EloadServicePanel } from "./EloadServicePanel";

interface ServicesPanelProps {
  selectedService: (typeof SERVICE_TYPES)[number]["key"];
  onSelectService: (key: (typeof SERVICE_TYPES)[number]["key"]) => void;
  serviceAmount: string;
  onServiceAmountChange: (value: string) => void;
  serviceFee: string;
  onServiceFeeChange: (value: string) => void;
  onAddService: () => void;
  walletBalance: number;
  onAddEloadService: (label: string, amount: number, fee: number) => void;
}

export function ServicesPanel({
  selectedService,
  onSelectService,
  serviceAmount,
  onServiceAmountChange,
  serviceFee,
  onServiceFeeChange,
  onAddService,
  walletBalance,
  onAddEloadService,
}: ServicesPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="tpl-g4" style={{ gap: 9, marginBottom: 0 }}>
        {SERVICE_TYPES.map((service) => (
          <button
            key={service.key}
            type="button"
            onClick={() => onSelectService(service.key)}
            className={`tpl-tile${selectedService === service.key ? " tpl-on" : ""}`}
          >
            <i className={`ti ${SERVICE_TILE_ICON[service.key]}`} aria-hidden />
            <p className="tpl-tn">{service.label}</p>
          </button>
        ))}
      </div>

      {selectedService === "eload" ? (
        <EloadServicePanel walletBalance={walletBalance} onAdd={onAddEloadService} />
      ) : (
        <div className="tpl-card">
          <p className="tpl-h3" style={{ marginBottom: 14 }}>
            {SERVICE_TYPES.find((s) => s.key === selectedService)?.label}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="svcAmount" className="tpl-lbl">
                {LABEL_AMOUNT_PESO}
              </label>
              <div className="tpl-fld">
                <input
                  id="svcAmount"
                  type="number"
                  min="0"
                  value={serviceAmount}
                  onFocus={selectOnFocus}
                  onChange={(e) => onServiceAmountChange(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="svcFee" className="tpl-lbl">
                {LABEL_FEE_PESO}
              </label>
              <div className="tpl-fld">
                <input
                  id="svcFee"
                  type="number"
                  min="0"
                  value={serviceFee}
                  onFocus={selectOnFocus}
                  onChange={(e) => onServiceFeeChange(e.target.value)}
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onAddService}
            disabled={!serviceAmount || Number(serviceAmount) <= 0}
            className="tpl-btnp"
            style={{ marginTop: 14, width: "auto", height: 38, padding: "0 16px", fontSize: 13 }}
          >
            {BUTTON_ADD_TO_CART}
          </button>
        </div>
      )}
    </div>
  );
}

const SERVICE_TILE_ICON: Record<(typeof SERVICE_TYPES)[number]["key"], string> = {
  eload: "ti-device-mobile-charging",
  cashin: "ti-arrow-down-circle",
  cashout: "ti-arrow-up-circle",
  print: "ti-printer",
};
