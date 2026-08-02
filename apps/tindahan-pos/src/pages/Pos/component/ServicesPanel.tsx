import { SERVICE_TYPES } from "../hooks";
import { EloadServicePanel } from "./EloadServicePanel";
import { CashInServicePanel } from "./CashInServicePanel";
import { CashOutServicePanel } from "./CashOutServicePanel";
import { PrintServicePanel } from "./PrintServicePanel";

interface ServicesPanelProps {
  selectedService: (typeof SERVICE_TYPES)[number]["key"];
  onSelectService: (key: (typeof SERVICE_TYPES)[number]["key"]) => void;
  walletBalance: number;
  onAddEloadService: (label: string, amount: number, fee: number) => void;
  drawerBalance: number;
  onAddCashInService: (label: string, amount: number, fee: number) => void;
  onAddCashOutService: (label: string, feeRevenue: number, cashHandedOver: number) => void;
  onAddPrintService: (label: string, amount: number, fee: number) => void;
}

export function ServicesPanel({
  selectedService,
  onSelectService,
  walletBalance,
  onAddEloadService,
  drawerBalance,
  onAddCashInService,
  onAddCashOutService,
  onAddPrintService,
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

      {selectedService === "eload" && <EloadServicePanel walletBalance={walletBalance} onAdd={onAddEloadService} />}
      {selectedService === "cashin" && (
        <CashInServicePanel drawerBalance={drawerBalance} onAdd={onAddCashInService} />
      )}
      {selectedService === "cashout" && (
        <CashOutServicePanel drawerBalance={drawerBalance} onAdd={onAddCashOutService} />
      )}
      {selectedService === "print" && <PrintServicePanel onAdd={onAddPrintService} />}
    </div>
  );
}

const SERVICE_TILE_ICON: Record<(typeof SERVICE_TYPES)[number]["key"], string> = {
  eload: "ti-device-mobile-charging",
  cashin: "ti-arrow-down-circle",
  cashout: "ti-arrow-up-circle",
  print: "ti-printer",
};
