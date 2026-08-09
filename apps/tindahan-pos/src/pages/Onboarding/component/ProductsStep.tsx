import { lazy, Suspense, type CSSProperties } from "react";
import { ScannerLoadingOverlay } from "@/components";
import {
  LABEL_WHAT_DO_YOU_SELL,
  TEXT_PRODUCTS_STEP_DESCRIPTION,
  LABEL_STARTER_CATALOG_HEADING,
  LABEL_FASTEST_BADGE,
  TEXT_STARTER_CATALOG_DESCRIPTION,
  BUTTON_ADD_N_ITEMS_PREFIX,
  TEXT_ITEMS_SUFFIX,
  TEXT_YOU_SET_OWN_PRICES_NEXT,
  LABEL_SCAN_SHELF_TITLE,
  TEXT_SCAN_SHELF_DESC,
  LABEL_IMPORT_SPREADSHEET_TITLE,
  TEXT_IMPORT_SPREADSHEET_DESC,
  LABEL_TYPE_THEM_IN_TITLE,
  TEXT_TYPE_THEM_IN_DESC,
  LABEL_ADDED_SO_FAR,
  TEXT_PRODUCTS_SUFFIX,
  TEXT_MORE_SUFFIX_PREFIX,
  TEXT_MORE_SUFFIX,
  BUTTON_CONTINUE,
  BUTTON_SKIP_FOR_NOW,
  TEXT_SAVED_AUTOMATICALLY,
} from "@/lib";
import { useProductsStep } from "../useProductsStep";
import { QuickAddProductModal } from "./QuickAddProductModal";

const BarcodeScanner = lazy(() =>
  import("@/components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);

const PREVIEW_CHIP_LIMIT = 4;

const importMethodCardStyle: CSSProperties = {
  textAlign: "left",
  cursor: "pointer",
  font: "inherit",
  width: "100%",
  position: "relative",
};

interface ProductsStepProps {
  onContinue: () => void;
  onSkip: () => void;
}

export function ProductsStep({ onContinue, onSkip }: ProductsStepProps) {
  const {
    products,
    starterCatalog,
    enabledCategoryKeys,
    toggleStarterCategory,
    starterItemsToAddCount,
    importingStarter,
    starterError,
    onImportStarterCatalog,

    showScanner,
    setShowScanner,
    onScannedBarcode,

    csvError,
    importingCsv,
    onCsvFile,

    showQuickAdd,
    setShowQuickAdd,
    quickAddForm,
    setQuickAddForm,
    quickAddError,
    savingQuickAdd,
    onQuickAddSubmit,
  } = useProductsStep();

  const previewProducts = products.slice(0, PREVIEW_CHIP_LIMIT);
  const remainingCount = products.length - previewProducts.length;

  return (
    <div style={{ padding: "26px 28px" }}>
      <p className="tpl-h1" style={{ marginBottom: 4 }}>
        {LABEL_WHAT_DO_YOU_SELL}
      </p>
      <p className="tpl-sub" style={{ marginBottom: 18 }}>
        {TEXT_PRODUCTS_STEP_DESCRIPTION}
      </p>

      <div
        className="tpl-card"
        style={{ marginBottom: 11, background: "rgba(76,141,255,.10)", border: "1px solid rgba(76,141,255,.42)" }}
      >
        <div className="tpl-row" style={{ marginBottom: 14, alignItems: "flex-start" }}>
          <span className="tpl-ic" style={{ width: 34, height: 34, borderRadius: 11, fontSize: 17 }}>
            <i className="ti ti-sparkles" aria-hidden />
          </span>
          <div className="tpl-flex1">
            <p className="tpl-h3">
              {LABEL_STARTER_CATALOG_HEADING}
              <span className="tpl-chip tpl-on" style={{ fontSize: 11, padding: "2px 9px", marginLeft: 5 }}>
                {LABEL_FASTEST_BADGE}
              </span>
            </p>
            <p style={{ color: "var(--tpl-t4)", fontSize: 13, lineHeight: 1.5 }}>
              {TEXT_STARTER_CATALOG_DESCRIPTION}
            </p>
          </div>
        </div>

        <div className="tpl-row" style={{ marginBottom: 14, flexWrap: "wrap" }}>
          {starterCatalog.map((category) => {
            const enabled = enabledCategoryKeys.has(category.key);
            return (
              <button
                key={category.key}
                type="button"
                className={`tpl-chip${enabled ? " tpl-on" : ""}`}
                aria-pressed={enabled}
                onClick={() => toggleStarterCategory(category.key)}
              >
                {enabled && <i className="ti ti-check" aria-hidden />}
                {category.label} &middot; {category.items.length}
              </button>
            );
          })}
        </div>

        <div className="tpl-row" style={{ flexWrap: "wrap", rowGap: 8 }}>
          <button
            type="button"
            className="tpl-btnp"
            style={{ width: "auto", marginBottom: 0, whiteSpace: "nowrap" }}
            disabled={importingStarter || starterItemsToAddCount === 0}
            onClick={onImportStarterCatalog}
          >
            {BUTTON_ADD_N_ITEMS_PREFIX} {starterItemsToAddCount} {TEXT_ITEMS_SUFFIX}
          </button>
          <p className="tpl-ts">{TEXT_YOU_SET_OWN_PRICES_NEXT}</p>
        </div>
        {starterError && (
          <p role="alert" className="tpl-emsg" style={{ marginTop: 10 }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {starterError}
          </p>
        )}
      </div>

      <div className="tpl-g3" style={{ marginBottom: 18 }}>
        <button type="button" className="tpl-card" style={importMethodCardStyle} onClick={() => setShowScanner(true)}>
          <i className="ti ti-barcode" style={{ fontSize: 19, color: "var(--tpl-t4)" }} aria-hidden />
          <p className="tpl-tp" style={{ margin: "8px 0 2px" }}>
            {LABEL_SCAN_SHELF_TITLE}
          </p>
          <p className="tpl-ts">{TEXT_SCAN_SHELF_DESC}</p>
        </button>

        <label className="tpl-card" style={importMethodCardStyle}>
          <i className="ti ti-file-spreadsheet" style={{ fontSize: 19, color: "var(--tpl-t4)" }} aria-hidden />
          <p className="tpl-tp" style={{ margin: "8px 0 2px" }}>
            {LABEL_IMPORT_SPREADSHEET_TITLE}
          </p>
          <p className="tpl-ts">{TEXT_IMPORT_SPREADSHEET_DESC}</p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onCsvFile}
            disabled={importingCsv}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
          />
        </label>

        <button type="button" className="tpl-card" style={importMethodCardStyle} onClick={() => setShowQuickAdd(true)}>
          <i className="ti ti-keyboard" style={{ fontSize: 19, color: "var(--tpl-t4)" }} aria-hidden />
          <p className="tpl-tp" style={{ margin: "8px 0 2px" }}>
            {LABEL_TYPE_THEM_IN_TITLE}
          </p>
          <p className="tpl-ts">{TEXT_TYPE_THEM_IN_DESC}</p>
        </button>
      </div>
      {csvError && (
        <p role="alert" className="tpl-emsg" style={{ marginTop: -10, marginBottom: 18 }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {csvError}
        </p>
      )}

      <div className="tpl-card" style={{ marginBottom: 18 }}>
        <div className="tpl-sp" style={{ marginBottom: 11 }}>
          <p className="tpl-h3">{LABEL_ADDED_SO_FAR}</p>
          <span className="tpl-ok" style={{ fontSize: 13 }}>
            {products.length} {TEXT_PRODUCTS_SUFFIX}
          </span>
        </div>
        <div className="tpl-row" style={{ flexWrap: "wrap" }}>
          {previewProducts.map((product) => (
            <span key={product.id} className="tpl-chip" style={{ borderRadius: 8 }}>
              {product.name} &middot; &#8369;{product.price}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="tpl-chip" style={{ borderRadius: 8 }}>
              {TEXT_MORE_SUFFIX_PREFIX}
              {remainingCount} {TEXT_MORE_SUFFIX}
            </span>
          )}
        </div>
      </div>

      <div className="tpl-row" style={{ flexWrap: "wrap", rowGap: 8 }}>
        <button
          type="button"
          className="tpl-btnp"
          style={{ width: "auto", marginBottom: 0, whiteSpace: "nowrap" }}
          onClick={onContinue}
        >
          {BUTTON_CONTINUE} <i className="ti ti-arrow-right" aria-hidden />
        </button>
        <button type="button" className="tpl-txt" style={{ whiteSpace: "nowrap" }} onClick={onSkip}>
          {BUTTON_SKIP_FOR_NOW}
        </button>
        <p className="tpl-ts" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
          {TEXT_SAVED_AUTOMATICALLY}
        </p>
      </div>

      {showScanner && (
        <Suspense fallback={<ScannerLoadingOverlay />}>
          <BarcodeScanner onDetected={onScannedBarcode} onClose={() => setShowScanner(false)} />
        </Suspense>
      )}

      {showQuickAdd && (
        <QuickAddProductModal
          form={quickAddForm}
          onFormChange={setQuickAddForm}
          error={quickAddError}
          saving={savingQuickAdd}
          onSubmit={onQuickAddSubmit}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
    </div>
  );
}
