import { lazy, Suspense } from "react";
import { BUTTON_SAVING, BUTTON_SAVE_RECEIVING_ENTRY } from "@/lib";
import { ScannerLoadingOverlay } from "@/components";
import {
  ReceivingPageHeader,
  SupplierAndDateFields,
  ProductSearchField,
  ReceivingLinesTable,
  ReceivingErrorMessage,
  ReceivingSavedMessage,
  ReceivingHistoryCard,
} from "./component";
import { useReceivingPage } from "./hooks";

const BarcodeScanner = lazy(() =>
  import("@/components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);

export function Receiving() {
  const {
    products,
    suppliers,
    receivingHistory,
    supplier,
    supplierId,
    date,
    setDate,
    lines,
    searchQuery,
    setSearchQuery,
    searchResults,
    scanMode,
    setScanMode,
    saving,
    error,
    savedMessage,
    addLine,
    handleSupplierNameChange,
    handleSupplierPick,
    handleScanDetected,
    updateLine,
    removeLine,
    handleSave,
  } = useReceivingPage();

  return (
    <div className="p-6">
      <ReceivingPageHeader />

      <div className="mt-6 card p-4">
        <SupplierAndDateFields
          suppliers={suppliers}
          supplier={supplier}
          supplierId={supplierId}
          date={date}
          onSupplierNameChange={handleSupplierNameChange}
          onSupplierPick={handleSupplierPick}
          onScanSupplier={() => setScanMode("supplier")}
          onDateChange={setDate}
        />

        <ProductSearchField
          searchQuery={searchQuery}
          searchResults={searchResults}
          onSearchQueryChange={setSearchQuery}
          onScanProduct={() => setScanMode("product")}
          onAddLine={addLine}
        />

        <ReceivingErrorMessage error={error} />

        <ReceivingLinesTable products={products} lines={lines} onUpdateLine={updateLine} onRemoveLine={removeLine} />

        <ReceivingSavedMessage message={savedMessage} />

        <button
          type="button"
          onClick={handleSave}
          disabled={lines.length === 0 || saving}
          className="mt-4 cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? BUTTON_SAVING : BUTTON_SAVE_RECEIVING_ENTRY}
        </button>
      </div>

      <ReceivingHistoryCard receivingHistory={receivingHistory} />

      {scanMode && (
        <Suspense fallback={<ScannerLoadingOverlay />}>
          <BarcodeScanner onDetected={handleScanDetected} onClose={() => setScanMode(null)} />
        </Suspense>
      )}
    </div>
  );
}
