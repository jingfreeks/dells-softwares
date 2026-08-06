import { lazy, Suspense } from "react";
import { ScannerLoadingOverlay, CategoryManager } from "@/components";
import {
  InventoryHeader,
  InventoryAlerts,
  InventoryFilters,
  InventoryTable,
  InventoryPagination,
  InventorySummary,
  ProductFormModal,
} from "./component";
import { useInventoryPage } from "./hooks";

const BarcodeScanner = lazy(() =>
  import("@/components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);

export function Inventory() {
  const {
    products,
    categories,
    loading,
    error,
    actionError,
    packPricingEnabled,
    query,
    categoryFilter,
    showForm,
    showCategoryManager,
    setShowCategoryManager,
    editingId,
    form,
    setForm,
    addingCategory,
    setAddingCategory,
    newCategoryName,
    setNewCategoryName,
    formError,
    submitting,
    showScanner,
    setShowScanner,
    duplicateProduct,
    currentPage,
    setPage,
    imagePreview,
    existingImageUrl,
    removeImage,
    imageError,
    processingImage,
    lowStock,
    filtered,
    totalPages,
    pageProducts,
    packPreview,
    handleQueryChange,
    handleCategoryFilterChange,
    checkDuplicateBarcode,
    openAddForm,
    openEditForm,
    setShowForm,
    handleImageSelect,
    handleRemoveImage,
    handleCategorySelect,
    handleCreateCategory,
    handleSubmit,
    handleRestock,
    handleRemove,
  } = useInventoryPage();

  return (
    <div className="tpl-root p-6">
      <InventoryHeader
        productCount={products.length}
        onOpenCategoryManager={() => setShowCategoryManager(true)}
        onAddProduct={openAddForm}
      />

      <InventoryAlerts error={error} actionError={actionError} loading={loading} lowStock={lowStock} />

      {!loading && <InventorySummary products={products} lowStockCount={lowStock.length} />}

      <InventoryFilters
        query={query}
        onQueryChange={handleQueryChange}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={handleCategoryFilterChange}
        categories={categories}
      />

      <InventoryTable
        loading={loading}
        pageProducts={pageProducts}
        filteredCount={filtered.length}
        query={query}
        packPricingEnabled={packPricingEnabled}
        onRestock={handleRestock}
        onEdit={openEditForm}
        onRemove={handleRemove}
      />

      <InventoryPagination
        visible={!loading && filtered.length > 0}
        currentPage={currentPage}
        totalPages={totalPages}
        filteredCount={filtered.length}
        onPageChange={setPage}
      />

      {showForm && (
        <ProductFormModal
          editingId={editingId}
          form={form}
          onFormChange={setForm}
          categories={categories}
          packPricingEnabled={packPricingEnabled}
          packPreview={packPreview}
          duplicateProduct={duplicateProduct}
          addingCategory={addingCategory}
          newCategoryName={newCategoryName}
          onNewCategoryNameChange={setNewCategoryName}
          onCategorySelect={handleCategorySelect}
          onCreateCategory={handleCreateCategory}
          onCancelAddingCategory={() => setAddingCategory(false)}
          imagePreview={imagePreview}
          existingImageUrl={existingImageUrl}
          removeImage={removeImage}
          imageError={imageError}
          processingImage={processingImage}
          onImageSelect={handleImageSelect}
          onRemoveImage={handleRemoveImage}
          onScanBarcode={() => setShowScanner(true)}
          onBarcodeChange={(value) => {
            setForm({ ...form, barcode: value });
            checkDuplicateBarcode(value);
          }}
          onOpenExistingProduct={openEditForm}
          formError={formError}
          submitting={submitting}
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}

      {showScanner && (
        <Suspense fallback={<ScannerLoadingOverlay />}>
          <BarcodeScanner
            onDetected={(code) => {
              setShowScanner(false);
              setForm({ ...form, barcode: code });
              checkDuplicateBarcode(code);
            }}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
      )}

      {showCategoryManager && <CategoryManager onClose={() => setShowCategoryManager(false)} />}
    </div>
  );
}
