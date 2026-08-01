import { PESO, selectOnFocus, LABEL_PRICING, LABEL_SELL_BY_PACK, LABEL_PACK_SIZE, LABEL_PACK_PRICE, TEXT_PACK_PREVIEW_PREFIX, TEXT_PER_PC_SUFFIX, LABEL_PRICE } from "@/lib";

interface ProductPricingFieldsProps {
  packPricingEnabled: boolean;
  packEnabled: boolean;
  onPackEnabledChange: (value: boolean) => void;
  packQuantity: string;
  onPackQuantityChange: (value: string) => void;
  packPrice: string;
  onPackPriceChange: (value: string) => void;
  packPreview: number | null;
  price: string;
  onPriceChange: (value: string) => void;
}

export function ProductPricingFields({
  packPricingEnabled,
  packEnabled,
  onPackEnabledChange,
  packQuantity,
  onPackQuantityChange,
  packPrice,
  onPackPriceChange,
  packPreview,
  price,
  onPriceChange,
}: ProductPricingFieldsProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-700">{LABEL_PRICING}</label>
        {packPricingEnabled && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={packEnabled}
              onChange={(e) => onPackEnabledChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {LABEL_SELL_BY_PACK}
          </label>
        )}
      </div>
      {packEnabled && packPricingEnabled ? (
        <div className="mt-1 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ppackqty" className="text-xs font-medium text-slate-700">
              {LABEL_PACK_SIZE}
            </label>
            <input
              id="ppackqty"
              type="number"
              min="2"
              step="1"
              value={packQuantity}
              onFocus={selectOnFocus}
              onChange={(e) => onPackQuantityChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div>
            <label htmlFor="ppackprice" className="text-xs font-medium text-slate-700">
              {LABEL_PACK_PRICE}
            </label>
            <input
              id="ppackprice"
              type="number"
              min="0"
              step="0.01"
              value={packPrice}
              onFocus={selectOnFocus}
              onChange={(e) => onPackPriceChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          {packPreview !== null && (
            <p className="col-span-2 text-xs text-slate-500">
              {TEXT_PACK_PREVIEW_PREFIX} {PESO.format(packPreview)} {TEXT_PER_PC_SUFFIX}
            </p>
          )}
        </div>
      ) : (
        <>
          <label htmlFor="pprice" className="sr-only">
            {LABEL_PRICE}
          </label>
          <input
            id="pprice"
            type="number"
            min="0"
            value={price}
            onFocus={selectOnFocus}
            onChange={(e) => onPriceChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </>
      )}
    </div>
  );
}
