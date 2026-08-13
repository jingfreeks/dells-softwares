import { lazy, Suspense } from "react";
import { PAGE_HEADING_POS, TEXT_POS_DESCRIPTION, BUTTON_SWITCH_CASHIER, LABEL_HELD_SALES } from "@/lib";
import { ScannerLoadingOverlay } from "@/components";
import {
  PosTabs,
  ProductBrowsePanel,
  ServicesPanel,
  CartPanel,
  OwnerApprovalModal,
  CashierLoginScreen,
  ReceiptModal,
  HeldSalesModal,
} from "./component";
import { usePosPage } from "./hooks";
import "../authTheme.css";

const BarcodeScanner = lazy(() =>
  import("@/components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);

export function Pos() {
  const {
    cart,
    productQuery,
    setProductQuery,
    searchError,
    tendered,
    setTendered,
    paymentType,
    selectPaymentType,
    referenceNo,
    setReferenceNo,
    customerQuery,
    setCustomerQuery,
    addingCustomer,
    customerError,
    lastReceiptTotal,
    checkingOut,
    checkoutError,
    showScanner,
    setShowScanner,
    activeTab,
    setActiveTab,
    activeCategory,
    setActiveCategory,
    customItemOpen,
    openCustomItem,
    cancelCustomItem,
    customItemName,
    setCustomItemName,
    customItemPrice,
    setCustomItemPrice,
    submitCustomItem,
    serviceLines,
    selectedService,
    setSelectedService,
    productInputRef,
    total,
    categories,
    products,
    visibleProducts,
    cartQuantityByProductId,
    priceLabel,
    change,
    selectedCustomer,
    customerResults,
    selectCustomer,
    clearCustomer,
    handleQuickAddCustomer,
    handleProductQuerySubmit,
    handleCameraDetected,
    handleAddProduct,
    incrementLine,
    removeLine,
    addEloadService,
    addCashInService,
    addCashOutService,
    addPrintService,
    removeServiceLine,
    walletBalance,
    drawerBalance,
    quickCashAmounts,
    handleCompleteSale,
    handleCancelSale,
    heldSales,
    heldSalesOpen,
    openHeldSales,
    closeHeldSales,
    holdCurrentSale,
    holdingSale,
    holdError,
    resumeHeldSale,
    resumeError,
    discardHeldSale,
    ownerApprovalOpen,
    overridePin,
    setOverridePin,
    overridePinError,
    overrideSubmitting,
    closeOwnerApproval,
    payCashInstead,
    submitOwnerApproval,
    effectiveTab,
    packPricingEnabled,
    posServicesEnabled,
    activeCashier,
    switchCashier,
    productsLoading,
    productsError,
    onRetryProducts,
    store,
    lastSaleRecord,
    lastSaleTendered,
    lastSaleChange,
    receiptSettings,
    receiptTin,
    receiptBusinessPermitNo,
    closeReceipt,
  } = usePosPage();

  if (!activeCashier) {
    return <CashierLoginScreen />;
  }

  return (
    <div className="tpl-root grid grid-cols-1 gap-6 p-6 lg:h-full lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="tpl-h1">{PAGE_HEADING_POS}</h1>
            <p className="tpl-sub" style={{ marginBottom: 0 }}>
              {TEXT_POS_DESCRIPTION}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="tpl-ts">{activeCashier.name}</span>
            <button type="button" className="tpl-lnk" onClick={openHeldSales}>
              {LABEL_HELD_SALES} ({heldSales.length})
            </button>
            <button type="button" className="tpl-lnk" onClick={switchCashier}>
              {BUTTON_SWITCH_CASHIER}
            </button>
          </div>
        </div>

        <PosTabs visible={posServicesEnabled} activeTab={activeTab} onTabChange={setActiveTab} />

        {effectiveTab === "products" ? (
          <ProductBrowsePanel
            productsLoading={productsLoading}
            productsError={productsError}
            onRetryProducts={onRetryProducts}
            productInputRef={productInputRef}
            productQuery={productQuery}
            onProductQueryChange={setProductQuery}
            onProductQuerySubmit={handleProductQuerySubmit}
            searchError={searchError}
            onOpenScanner={() => setShowScanner(true)}
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            visibleProducts={visibleProducts}
            cartQuantityByProductId={cartQuantityByProductId}
            priceLabel={priceLabel}
            onAddProduct={handleAddProduct}
            customItemOpen={customItemOpen}
            onOpenCustomItem={openCustomItem}
            onCancelCustomItem={cancelCustomItem}
            customItemName={customItemName}
            onCustomItemNameChange={setCustomItemName}
            customItemPrice={customItemPrice}
            onCustomItemPriceChange={setCustomItemPrice}
            onSubmitCustomItem={submitCustomItem}
          />
        ) : (
          <ServicesPanel
            selectedService={selectedService}
            onSelectService={setSelectedService}
            walletBalance={walletBalance}
            onAddEloadService={addEloadService}
            drawerBalance={drawerBalance}
            onAddCashInService={addCashInService}
            onAddCashOutService={addCashOutService}
            onAddPrintService={addPrintService}
          />
        )}
      </div>

      <CartPanel
        cart={cart}
        serviceLines={serviceLines}
        packPricingEnabled={packPricingEnabled}
        priceLabel={priceLabel}
        onIncrement={incrementLine}
        onRemove={removeLine}
        onRemoveService={removeServiceLine}
        total={total}
        paymentType={paymentType}
        onSelectPaymentType={selectPaymentType}
        tendered={tendered}
        onTenderedChange={setTendered}
        quickCashAmounts={quickCashAmounts}
        change={change}
        referenceNo={referenceNo}
        onReferenceNoChange={setReferenceNo}
        selectedCustomer={selectedCustomer}
        onClearCustomer={clearCustomer}
        customerQuery={customerQuery}
        onCustomerQueryChange={setCustomerQuery}
        customerResults={customerResults}
        onSelectCustomer={selectCustomer}
        addingCustomer={addingCustomer}
        onQuickAddCustomer={handleQuickAddCustomer}
        customerError={customerError}
        lastReceiptTotal={lastReceiptTotal}
        checkoutError={checkoutError}
        holdError={holdError}
        checkingOut={checkingOut}
        holdingSale={holdingSale}
        onCancelSale={handleCancelSale}
        onCompleteSale={handleCompleteSale}
        onHold={holdCurrentSale}
      />

      {showScanner && (
        <Suspense fallback={<ScannerLoadingOverlay />}>
          <BarcodeScanner onDetected={handleCameraDetected} onClose={() => setShowScanner(false)} />
        </Suspense>
      )}

      <OwnerApprovalModal
        open={ownerApprovalOpen}
        customer={selectedCustomer}
        total={total}
        pin={overridePin}
        onPinChange={setOverridePin}
        onSubmit={submitOwnerApproval}
        pinError={overridePinError}
        submitting={overrideSubmitting}
        onCancel={closeOwnerApproval}
        onPayCashInstead={payCashInstead}
      />

      <HeldSalesModal
        open={heldSalesOpen}
        heldSales={heldSales}
        products={products}
        resumeError={resumeError}
        onResume={resumeHeldSale}
        onDiscard={discardHeldSale}
        onClose={closeHeldSales}
      />

      <ReceiptModal
        open={!!lastSaleRecord}
        sale={lastSaleRecord}
        store={store}
        settings={receiptSettings}
        tin={receiptTin}
        businessPermitNo={receiptBusinessPermitNo}
        tendered={lastSaleTendered}
        change={lastSaleChange}
        autoPrint={receiptSettings.autoPrintEverySale}
        onClose={closeReceipt}
      />
    </div>
  );
}
