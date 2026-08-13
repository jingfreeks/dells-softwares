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
  ReceivingCostChangeNote,
  ReceivingLowStockNote,
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
    drNumber,
    setDrNumber,
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
    previousCostFor,
    lowStockSuggestions,
    addAllLowStock,
    raisePriceToProduct,
  } = useReceivingPage();

  return (
    <div className="tpl-root p-6">
      <ReceivingPageHeader />

      <ReceivingLowStockNote suggestions={lowStockSuggestions} onAddAll={addAllLowStock} />

      <div className="tpl-card">
        <SupplierAndDateFields
          suppliers={suppliers}
          supplier={supplier}
          supplierId={supplierId}
          drNumber={drNumber}
          date={date}
          onSupplierNameChange={handleSupplierNameChange}
          onSupplierPick={handleSupplierPick}
          onScanSupplier={() => setScanMode("supplier")}
          onDrNumberChange={setDrNumber}
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

        <ReceivingLinesTable
          products={products}
          lines={lines}
          previousCostFor={previousCostFor}
          onUpdateLine={updateLine}
          onRemoveLine={removeLine}
        />

        <ReceivingCostChangeNote
          products={products}
          lines={lines}
          previousCostFor={previousCostFor}
          onRaisePrice={raisePriceToProduct}
        />

        <ReceivingSavedMessage message={savedMessage} />

        <button
          type="button"
          onClick={handleSave}
          disabled={lines.length === 0 || saving}
          className="tpl-btnp"
          style={{ width: "auto", height: 40, padding: "0 18px", marginTop: 14, marginBottom: 0 }}
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
