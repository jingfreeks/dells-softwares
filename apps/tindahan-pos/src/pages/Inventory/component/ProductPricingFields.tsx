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
    <div style={{ marginBottom: 14 }}>
      <div className="tpl-sp">
        <span className="tpl-lbl">{LABEL_PRICING}</span>
        {packPricingEnabled && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--tpl-t5)" }}>
            <button
              type="button"
              role="switch"
              aria-checked={packEnabled}
              aria-label={LABEL_SELL_BY_PACK}
              onClick={() => onPackEnabledChange(!packEnabled)}
              className={`tpl-tog${packEnabled ? " tpl-on" : ""}`}
            >
              <span />
            </button>
            {LABEL_SELL_BY_PACK}
          </label>
        )}
      </div>
      {packEnabled && packPricingEnabled ? (
        <div className="tpl-g2" style={{ marginTop: 6 }}>
          <div>
            <label htmlFor="ppackqty" className="tpl-lbl">
              {LABEL_PACK_SIZE}
            </label>
            <div className="tpl-fld">
              <input
                id="ppackqty"
                type="number"
                min="2"
                step="1"
                value={packQuantity}
                onFocus={selectOnFocus}
                onChange={(e) => onPackQuantityChange(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="ppackprice" className="tpl-lbl">
              {LABEL_PACK_PRICE}
            </label>
            <div className="tpl-fld">
              <input
                id="ppackprice"
                type="number"
                min="0"
                step="0.01"
                value={packPrice}
                onFocus={selectOnFocus}
                onChange={(e) => onPackPriceChange(e.target.value)}
              />
            </div>
          </div>
          {packPreview !== null && (
            <p className="tpl-hint" style={{ gridColumn: "1 / -1" }}>
              {TEXT_PACK_PREVIEW_PREFIX} {PESO.format(packPreview)} {TEXT_PER_PC_SUFFIX}
            </p>
          )}
        </div>
      ) : (
        <>
          <label htmlFor="pprice" className="sr-only">
            {LABEL_PRICE}
          </label>
          <div className="tpl-fld" style={{ marginTop: 6 }}>
            <input
              id="pprice"
              type="number"
              min="0"
              value={price}
              onFocus={selectOnFocus}
              onChange={(e) => onPriceChange(e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}
