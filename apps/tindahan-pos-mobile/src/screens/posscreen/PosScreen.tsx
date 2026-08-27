import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { PESO } from "../../lib/money";
import { BarcodeScannerModal } from "../../components/BarcodeScannerModal";
import { CartSheet } from "../pos/CartSheet";
import { ProductTile } from "../pos/ProductTile";
import { ALL_CATEGORY, usePosScreen } from "./hooks";
import type { PosScreenProps } from "./types";

export function PosScreen(props: PosScreenProps = {}) {
  const { onOpenSetupRegister, onOpenHome } = props;
  const {
    user,
    device,
    store,
    logout,
    activeCashier,
    endCashierSession,
    categories,
    loading,
    error,
    cart,
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    showScanner,
    setShowScanner,
    barcodeError,
    showCart,
    setShowCart,
    tendered,
    setTendered,
    checkingOut,
    checkoutError,
    lastReceiptTotal,
    paymentSegment,
    setPaymentSegment,
    paymentType,
    referenceNo,
    setReferenceNo,
    customerQuery,
    setCustomerQuery,
    selectedCustomer,
    setSelectedCustomer,
    discountEnabled,
    setDiscountEnabled,
    discountType,
    setDiscountType,
    discountValueText,
    setDiscountValueText,
    subtotal,
    discountAmount,
    total,
    cartQuantityByProductId,
    displayedProducts,
    customerResults,
    change,
    creditWarning,
    canComplete,
    handleScanned,
    handleTilePress,
    handleCompleteSale,
    incrementLine,
    decrementLine,
    selectCustomer,
  } = usePosScreen();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background-start">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-start pt-14 px-4.5">
      <View className="flex-row items-center gap-3 mb-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan with camera"
          onPress={() => setShowScanner(true)}
          className="w-10 h-10 rounded-icon-square bg-panel-strong border border-hairline items-center justify-center"
        >
          <Feather name="camera" size={17} color={colors.textPrimary} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-medium text-text-primary">Sell</Text>
          <Text className="text-xs text-text-faint mt-px">
            {activeCashier?.name ?? user?.name ?? "Cashier"}
            {store?.name ? ` · ${store.name}` : ""}
          </Text>
        </View>
        {user?.role === "admin" && onOpenHome && (
          <Pressable accessibilityRole="button" onPress={onOpenHome} hitSlop={8}>
            <Text className="text-[12.5px] text-accent-soft font-medium">Home</Text>
          </Pressable>
        )}
        {user?.role === "admin" && onOpenSetupRegister && (
          <Pressable accessibilityRole="button" onPress={onOpenSetupRegister} hitSlop={8}>
            <Text className="text-[12.5px] text-accent-soft font-medium">Register</Text>
          </Pressable>
        )}
        {device && activeCashier && (
          <Pressable accessibilityRole="button" onPress={() => endCashierSession()} hitSlop={8}>
            <Text className="text-[12.5px] text-accent-soft font-medium">Switch</Text>
          </Pressable>
        )}
        {user && (
          <Pressable accessibilityRole="button" onPress={logout} hitSlop={8}>
            <Text className="text-[12.5px] text-accent-soft font-medium">Sign out</Text>
          </Pressable>
        )}
      </View>

      {error && <Text className="text-error text-[13px] mb-2">{error}</Text>}
      {lastReceiptTotal !== null && (
        <Text accessibilityRole="text" className="text-success text-[13px] mb-2">
          Sale recorded — {PESO.format(lastReceiptTotal)}. Stock updated.
        </Text>
      )}

      <View className="flex-row mb-3">
        <View className="flex-1 flex-row items-center gap-2 border border-accent bg-panel-strong rounded-input px-3.5 h-[46px]">
          <Feather name="search" size={16} color={colors.textFaint} />
          <TextInput
            accessibilityLabel="Search products"
            placeholder="Search or scan"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-[15px] text-text-primary"
          />
        </View>
      </View>

      {barcodeError && (
        <Text accessibilityRole="alert" className="text-error text-[13px] mb-2">
          {barcodeError}
        </Text>
      )}

      <View className="flex-row flex-wrap gap-2 mb-3.5">
        <Pressable
          accessibilityRole="button"
          onPress={() => setSelectedCategoryId(ALL_CATEGORY)}
          className={`h-8 px-3.5 rounded-chip border items-center justify-center ${
            selectedCategoryId === ALL_CATEGORY ? "bg-accent border-accent" : "bg-panel-strong border-hairline"
          }`}
        >
          <Text className={`text-[12.5px] ${selectedCategoryId === ALL_CATEGORY ? "text-text-primary font-medium" : "text-text-dim"}`}>
            All
          </Text>
        </Pressable>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            onPress={() => setSelectedCategoryId(category.id)}
            className={`h-8 px-3.5 rounded-chip border items-center justify-center ${
              selectedCategoryId === category.id ? "bg-accent border-accent" : "bg-panel-strong border-hairline"
            }`}
          >
            <Text className={`text-[12.5px] ${selectedCategoryId === category.id ? "text-text-primary font-medium" : "text-text-dim"}`}>
              {category.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row flex-wrap gap-[4%] pb-[100px]">
        {displayedProducts.length === 0 ? (
          <Text className="text-text-faint text-[13px] text-center w-full mt-5">No products found.</Text>
        ) : (
          displayedProducts.map((product) => (
            <ProductTile
              key={product.id}
              product={product}
              quantityInCart={cartQuantityByProductId.get(product.id) ?? 0}
              onPress={() => handleTilePress(product)}
            />
          ))
        )}
      </View>

      {cart.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View cart"
          onPress={() => setShowCart(true)}
          className="absolute left-4.5 right-4.5 bottom-5 h-14 rounded-card bg-accent flex-row items-center px-4 gap-2.5"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <View className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.25)] items-center justify-center">
            <Text className="text-xs font-semibold text-text-primary">{cart.reduce((sum, l) => sum + l.quantity, 0)}</Text>
          </View>
          <Text className="flex-1 text-[15px] font-medium text-text-primary">View cart</Text>
          <Text className="text-[15px] font-semibold text-text-primary">{PESO.format(total)}</Text>
          <Feather name="chevron-right" size={19} color={colors.textPrimary} />
        </Pressable>
      )}

      <BarcodeScannerModal visible={showScanner} onDetected={handleScanned} onClose={() => setShowScanner(false)} />

      <CartSheet
        visible={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        onIncrement={incrementLine}
        onDecrement={decrementLine}
        subtotal={subtotal}
        discountAmount={discountAmount}
        total={total}
        discountEnabled={discountEnabled}
        discountType={discountType}
        discountValueText={discountValueText}
        onToggleDiscount={() => {
          setDiscountEnabled((prev) => !prev);
          setDiscountValueText("");
        }}
        onDiscountTypeChange={setDiscountType}
        onDiscountValueChange={setDiscountValueText}
        paymentSegment={paymentSegment}
        onPaymentSegmentChange={setPaymentSegment}
        paymentType={paymentType}
        tendered={tendered}
        onTenderedChange={setTendered}
        change={change}
        referenceNo={referenceNo}
        onReferenceNoChange={setReferenceNo}
        customerQuery={customerQuery}
        onCustomerQueryChange={setCustomerQuery}
        customerResults={customerResults}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={selectCustomer}
        onClearCustomer={() => setSelectedCustomer(null)}
        creditWarning={creditWarning}
        checkingOut={checkingOut}
        checkoutError={checkoutError}
        canComplete={canComplete}
        onCompleteSale={handleCompleteSale}
      />
    </View>
  );
}
