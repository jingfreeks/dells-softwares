import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { useCashierSession } from "../lib/cashierSession";
import { useStoreData, type CheckoutDiscount, type CheckoutPayment } from "../lib/storeData";
import { addToCart, cartTotal, computeChange, findProductByBarcode, setQuantity } from "../lib/pos";
import { computeDiscountAmount } from "../lib/discount";
import { wouldExceedCreditLimit } from "../lib/customers";
import { PESO } from "../lib/money";
import { colors, radii } from "../theme/colors";
import type { CartLine, Customer, PaymentType, Product } from "../lib/types";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import { CartSheet } from "./pos/CartSheet";
import { ProductTile } from "./pos/ProductTile";

const PAYMENT_SEGMENTS = ["Cash", "GCash", "Utang"] as const;
const PAYMENT_TYPE_BY_SEGMENT: Record<(typeof PAYMENT_SEGMENTS)[number], PaymentType> = {
  Cash: "cash",
  GCash: "qr",
  Utang: "credit",
};
const ALL_CATEGORY = "__all__";

interface PosScreenProps {
  /** Admin-only entry point to the device-pairing settings screen (see App.tsx). */
  onOpenSetupRegister?: () => void;
}

export function PosScreen({ onOpenSetupRegister }: PosScreenProps = {}) {
  const { user, device, store, logout } = useAuth();
  const { activeCashier, cashierToken, endCashierSession, reportExpiredSession } = useCashierSession();
  const { products, categories, customers, loading, error, checkout } = useStoreData();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORY);
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [tendered, setTendered] = useState("0");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [lastReceiptTotal, setLastReceiptTotal] = useState<number | null>(null);

  const [paymentSegment, setPaymentSegment] = useState<(typeof PAYMENT_SEGMENTS)[number]>("Cash");
  const paymentType = PAYMENT_TYPE_BY_SEGMENT[paymentSegment];
  const [referenceNo, setReferenceNo] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<CheckoutDiscount["type"]>("percentage");
  const [discountValueText, setDiscountValueText] = useState("");

  const subtotal = useMemo(() => cartTotal(cart), [cart]);
  const discount: CheckoutDiscount | null = useMemo(() => {
    if (!discountEnabled) return null;
    const value = Number(discountValueText);
    if (!discountValueText.trim() || Number.isNaN(value) || value <= 0) return null;
    return { type: discountType, value };
  }, [discountEnabled, discountType, discountValueText]);
  const discountAmount = useMemo(() => computeDiscountAmount(subtotal, discount), [subtotal, discount]);
  const total = subtotal - discountAmount;

  const cartQuantityByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart) map.set(line.product.id, line.quantity);
    return map;
  }, [cart]);

  const displayedProducts = useMemo(() => {
    const base =
      selectedCategoryId === ALL_CATEGORY ? products : products.filter((p) => p.categoryId === selectedCategoryId);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, selectedCategoryId, searchQuery]);

  const customerResults = useMemo(() => {
    if (!customerQuery.trim()) return [];
    const q = customerQuery.trim().toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [customers, customerQuery]);

  const tenderedNumber = Number(tendered);
  const change =
    tendered.trim() !== "" && !Number.isNaN(tenderedNumber) ? computeChange(total, tenderedNumber) : null;

  const creditWarning =
    paymentType === "credit" && selectedCustomer && wouldExceedCreditLimit(selectedCustomer, total)
      ? `This would put ${selectedCustomer.name} over their credit limit.`
      : null;

  const canComplete =
    cart.length > 0 &&
    !checkingOut &&
    (paymentType === "cash"
      ? change !== null
      : paymentType === "qr"
        ? referenceNo.trim().length > 0
        : selectedCustomer !== null);

  function addByBarcode(barcode: string) {
    const product = findProductByBarcode(products, barcode);
    if (!product) {
      setBarcodeError(`Product not found for barcode "${barcode}".`);
      return;
    }
    setBarcodeError(null);
    setCart((prev) => addToCart(prev, product));
  }

  function handleScanned(barcode: string) {
    setShowScanner(false);
    addByBarcode(barcode);
  }

  function handleTilePress(product: Product) {
    setCart((prev) => addToCart(prev, product));
  }

  function resetSaleState() {
    setCart([]);
    setTendered("0");
    setPaymentSegment("Cash");
    setReferenceNo("");
    setCustomerQuery("");
    setSelectedCustomer(null);
    setDiscountEnabled(false);
    setDiscountValueText("");
  }

  async function handleCompleteSale() {
    if (!canComplete) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const payment: CheckoutPayment =
        paymentType === "credit"
          ? { type: "credit", customerId: selectedCustomer!.id }
          : paymentType === "qr"
            ? { type: "qr", referenceNo: referenceNo.trim() }
            : { type: "cash" };
      await checkout(cart, [], activeCashier?.name ?? user?.name ?? "Cashier", payment, discount, cashierToken);
      setLastReceiptTotal(total);
      resetSaleState();
      setShowCart(false);
      setTimeout(() => setLastReceiptTotal(null), 4000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not complete sale.";
      if (message.includes("EXPIRED_CASHIER_SESSION")) {
        reportExpiredSession();
      }
      setCheckoutError(message);
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Scan with camera" onPress={() => setShowScanner(true)} style={styles.iconButton}>
          <Feather name="camera" size={17} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sell</Text>
          <Text style={styles.subtitle}>
            {activeCashier?.name ?? user?.name ?? "Cashier"}
            {store?.name ? ` · ${store.name}` : ""}
          </Text>
        </View>
        {user?.role === "admin" && onOpenSetupRegister && (
          <Pressable accessibilityRole="button" onPress={onOpenSetupRegister} hitSlop={8}>
            <Text style={styles.headerLink}>Register</Text>
          </Pressable>
        )}
        {device && activeCashier && (
          <Pressable accessibilityRole="button" onPress={() => endCashierSession()} hitSlop={8}>
            <Text style={styles.headerLink}>Switch</Text>
          </Pressable>
        )}
        {user && (
          <Pressable accessibilityRole="button" onPress={logout} hitSlop={8}>
            <Text style={styles.headerLink}>Sign out</Text>
          </Pressable>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {lastReceiptTotal !== null && (
        <Text accessibilityRole="text" style={styles.success}>
          Sale recorded — {PESO.format(lastReceiptTotal)}. Stock updated.
        </Text>
      )}

      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Feather name="search" size={16} color={colors.textFaint} />
          <TextInput
            accessibilityLabel="Search products"
            placeholder="Search or scan"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>
      </View>

      {barcodeError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {barcodeError}
        </Text>
      )}

      <View style={styles.chipRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSelectedCategoryId(ALL_CATEGORY)}
          style={[styles.chip, selectedCategoryId === ALL_CATEGORY && styles.chipOn]}
        >
          <Text style={[styles.chipText, selectedCategoryId === ALL_CATEGORY && styles.chipTextOn]}>All</Text>
        </Pressable>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            onPress={() => setSelectedCategoryId(category.id)}
            style={[styles.chip, selectedCategoryId === category.id && styles.chipOn]}
          >
            <Text style={[styles.chipText, selectedCategoryId === category.id && styles.chipTextOn]}>{category.name}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.grid}>
        {displayedProducts.length === 0 ? (
          <Text style={styles.emptyText}>No products found.</Text>
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
        <Pressable accessibilityRole="button" accessibilityLabel="View cart" onPress={() => setShowCart(true)} style={styles.cartBar}>
          <View style={styles.cartBarCount}>
            <Text style={styles.cartBarCountText}>{cart.reduce((sum, l) => sum + l.quantity, 0)}</Text>
          </View>
          <Text style={styles.cartBarLabel}>View cart</Text>
          <Text style={styles.cartBarTotal}>{PESO.format(total)}</Text>
          <Feather name="chevron-right" size={19} color={colors.textPrimary} />
        </Pressable>
      )}

      <BarcodeScannerModal visible={showScanner} onDetected={handleScanned} onClose={() => setShowScanner(false)} />

      <CartSheet
        visible={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        onIncrement={(productId) => {
          const line = cart.find((l) => l.product.id === productId);
          if (line) setCart((prev) => setQuantity(prev, productId, line.quantity + 1));
        }}
        onDecrement={(productId) => {
          const line = cart.find((l) => l.product.id === productId);
          if (line) setCart((prev) => setQuantity(prev, productId, line.quantity - 1));
        }}
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
        onSelectCustomer={(c) => {
          setSelectedCustomer(c);
          setCustomerQuery("");
        }}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundStart, paddingTop: 56, paddingHorizontal: 18 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.backgroundStart },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.iconSquare,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "500", color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textFaint, marginTop: 1 },
  headerLink: { fontSize: 12.5, color: colors.accentSoft, fontWeight: "500" },
  error: { color: colors.error, fontSize: 13, marginBottom: 8 },
  success: { color: colors.success, fontSize: 13, marginBottom: 8 },
  searchRow: { flexDirection: "row", marginBottom: 12 },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.panelStrong,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panelStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12.5, color: colors.textDim },
  chipTextOn: { color: colors.textPrimary, fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: "4%", paddingBottom: 100 },
  emptyText: { color: colors.textFaint, fontSize: 13, textAlign: "center", width: "100%", marginTop: 20 },
  cartBar: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 20,
    height: 56,
    borderRadius: radii.card,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cartBarCount: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBarCountText: { fontSize: 12, fontWeight: "600", color: colors.textPrimary },
  cartBarLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  cartBarTotal: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
});
