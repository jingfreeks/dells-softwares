import { lazy, Suspense } from "react";
import { PAGE_HEADING_POS, TEXT_POS_DESCRIPTION } from "@/lib";
import { ScannerLoadingOverlay } from "@/components";
import { PosTabs, ProductBrowsePanel, ServicesPanel, CartPanel } from "./component";
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
    serviceAmount,
    setServiceAmount,
    serviceFee,
    setServiceFee,
    productInputRef,
    total,
    categories,
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
    handleAddService,
    addEloadService,
    removeServiceLine,
    walletBalance,
    quickCashAmounts,
    handleCompleteSale,
    handleCancelSale,
    effectiveTab,
    packPricingEnabled,
    posServicesEnabled,
  } = usePosPage();

  return (
    <div className="tpl-root grid grid-cols-1 gap-6 p-6 lg:h-full lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="tpl-h1">{PAGE_HEADING_POS}</h1>
          <p className="tpl-sub" style={{ marginBottom: 0 }}>
            {TEXT_POS_DESCRIPTION}
          </p>
        </div>

        <PosTabs visible={posServicesEnabled} activeTab={activeTab} onTabChange={setActiveTab} />

        {effectiveTab === "products" ? (
          <ProductBrowsePanel
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
            serviceAmount={serviceAmount}
            onServiceAmountChange={setServiceAmount}
            serviceFee={serviceFee}
            onServiceFeeChange={setServiceFee}
            onAddService={handleAddService}
            walletBalance={walletBalance}
            onAddEloadService={addEloadService}
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
        checkingOut={checkingOut}
        onCancelSale={handleCancelSale}
        onCompleteSale={handleCompleteSale}
      />

      {showScanner && (
        <Suspense fallback={<ScannerLoadingOverlay />}>
          <BarcodeScanner onDetected={handleCameraDetected} onClose={() => setShowScanner(false)} />
        </Suspense>
      )}
    </div>
  );
}
