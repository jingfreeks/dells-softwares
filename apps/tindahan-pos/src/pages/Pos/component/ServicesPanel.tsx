import { selectOnFocus, LABEL_AMOUNT_PESO, LABEL_FEE_PESO, BUTTON_ADD_TO_CART } from "@/lib";
import { SERVICE_TYPES } from "../hooks";

interface ServicesPanelProps {
  selectedService: (typeof SERVICE_TYPES)[number]["key"];
  onSelectService: (key: (typeof SERVICE_TYPES)[number]["key"]) => void;
  serviceAmount: string;
  onServiceAmountChange: (value: string) => void;
  serviceFee: string;
  onServiceFeeChange: (value: string) => void;
  onAddService: () => void;
}

export function ServicesPanel({
  selectedService,
  onSelectService,
  serviceAmount,
  onServiceAmountChange,
  serviceFee,
  onServiceFeeChange,
  onAddService,
}: ServicesPanelProps) {
  return (
    <div className="card p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SERVICE_TYPES.map((service) => (
          <button
            key={service.key}
            type="button"
            onClick={() => onSelectService(service.key)}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 transition-colors sm:p-4 ${
              selectedService === service.key
                ? "border-[var(--color-brand)] bg-[var(--color-brand)]/5"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${service.badgeClass}`}>
              {service.badge}
            </span>
            <span className="text-sm font-medium text-slate-800">{service.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-900">
          {SERVICE_TYPES.find((s) => s.key === selectedService)?.label}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="svcAmount" className="text-xs font-medium text-slate-700">
              {LABEL_AMOUNT_PESO}
            </label>
            <input
              id="svcAmount"
              type="number"
              min="0"
              value={serviceAmount}
              onFocus={selectOnFocus}
              onChange={(e) => onServiceAmountChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div>
            <label htmlFor="svcFee" className="text-xs font-medium text-slate-700">
              {LABEL_FEE_PESO}
            </label>
            <input
              id="svcFee"
              type="number"
              min="0"
              value={serviceFee}
              onFocus={selectOnFocus}
              onChange={(e) => onServiceFeeChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onAddService}
          disabled={!serviceAmount || Number(serviceAmount) <= 0}
          className="mt-3 cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {BUTTON_ADD_TO_CART}
        </button>
      </div>
    </div>
  );
}
