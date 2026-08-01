import type { FormEvent, RefObject } from "react";
import type { Product } from "@/lib";
import type { BrowseMode } from "../hooks";
import { BrowseModeSwitch } from "./BrowseModeSwitch";
import { ScanBarcodeForm } from "./ScanBarcodeForm";
import { SearchByNameField } from "./SearchByNameField";
import { QuickItemsGrid } from "./QuickItemsGrid";

interface ProductBrowsePanelProps {
  browseMode: BrowseMode;
  onScanMode: () => void;
  onSearchMode: () => void;
  onQuickMode: () => void;
  barcodeInputRef: RefObject<HTMLInputElement | null>;
  barcodeInput: string;
  onBarcodeInputChange: (value: string) => void;
  barcodeError: string | null;
  onScanSubmit: (e: FormEvent) => void;
  onOpenScanner: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchResults: Product[];
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  visibleQuickItems: Product[];
  priceLabel: (product: Product) => string | null;
  onAddProduct: (productId: string) => void;
}

export function ProductBrowsePanel({
  browseMode,
  onScanMode,
  onSearchMode,
  onQuickMode,
  barcodeInputRef,
  barcodeInput,
  onBarcodeInputChange,
  barcodeError,
  onScanSubmit,
  onOpenScanner,
  searchInputRef,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  categories,
  activeCategory,
  onCategoryChange,
  visibleQuickItems,
  priceLabel,
  onAddProduct,
}: ProductBrowsePanelProps) {
  return (
    <div className="card p-4">
      <BrowseModeSwitch
        browseMode={browseMode}
        onScanMode={onScanMode}
        onSearchMode={onSearchMode}
        onQuickMode={onQuickMode}
      />

      {browseMode === "scan" && (
        <ScanBarcodeForm
          barcodeInputRef={barcodeInputRef}
          barcodeInput={barcodeInput}
          onBarcodeInputChange={onBarcodeInputChange}
          barcodeError={barcodeError}
          onSubmit={onScanSubmit}
          onOpenScanner={onOpenScanner}
        />
      )}

      {browseMode === "search" && (
        <SearchByNameField
          searchInputRef={searchInputRef}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          searchResults={searchResults}
          priceLabel={priceLabel}
          onAddProduct={onAddProduct}
        />
      )}

      {browseMode === "quick" && (
        <QuickItemsGrid
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={onCategoryChange}
          visibleQuickItems={visibleQuickItems}
          priceLabel={priceLabel}
          onAddProduct={onAddProduct}
        />
      )}
    </div>
  );
}
