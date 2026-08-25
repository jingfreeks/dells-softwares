import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { useCashierSession } from "../lib/cashierSession";
import { useStoreData, type CheckoutDiscount, type CheckoutPayment } from "../lib/storeData";
import {
  addToCart,
  cartTotal,
  computeChange,
  findProductByBarcode,
  lineTotal,
  removeFromCart,
  searchProductsByName,
  setQuantity,
} from "../lib/pos";
import { computeDiscountAmount } from "../lib/discount";
import { wouldExceedCreditLimit } from "../lib/customers";
import { PESO } from "../lib/money";
import type { CartLine, Customer, PaymentType } from "../lib/types";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import { SegmentedControl } from "../components/SegmentedControl";

const PAYMENT_SEGMENTS = ["Cash", "GCash", "Utang"] as const;
const PAYMENT_TYPE_BY_SEGMENT: Record<(typeof PAYMENT_SEGMENTS)[number], PaymentType> = {
  Cash: "cash",
  GCash: "qr",
  Utang: "credit",
};
const SEGMENT_BY_PAYMENT_TYPE: Record<PaymentType, (typeof PAYMENT_SEGMENTS)[number]> = {
  cash: "Cash",
  qr: "GCash",
  credit: "Utang",
};

interface PosScreenProps {
  /** Admin-only entry point to the device-pairing settings screen (see App.tsx). */
  onOpenSetupRegister?: () => void;
}

export function PosScreen({ onOpenSetupRegister }: PosScreenProps = {}) {
  const { user, device, store, logout } = useAuth();
  const { activeCashier, cashierToken, endCashierSession, reportExpiredSession } = useCashierSession();
  const { products, customers, loading, error, checkout } = useStoreData();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
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

  const searchResults = useMemo(
    () => searchProductsByName(products, searchQuery).slice(0, 8),
    [products, searchQuery]
  );
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

  function handleAddProduct(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prev) => addToCart(prev, product));
    setSearchQuery("");
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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.storeName}>{store?.name ?? "POS"}</Text>
          <Text style={styles.cashier}>{activeCashier?.name ?? user?.name}</Text>
        </View>
        <View style={styles.headerActions}>
          {user?.role === "admin" && onOpenSetupRegister && (
            <TouchableOpacity onPress={onOpenSetupRegister}>
              <Text style={styles.headerLink}>Set up a register</Text>
            </TouchableOpacity>
          )}
          {device && activeCashier && (
            <TouchableOpacity onPress={() => endCashierSession()}>
              <Text style={styles.headerLink}>Switch cashier</Text>
            </TouchableOpacity>
          )}
          {user && (
            <TouchableOpacity onPress={logout}>
              <Text style={styles.logout}>Sign out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search products"
          placeholder="Search by name…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        <TouchableOpacity
          accessibilityLabel="Scan with camera"
          style={styles.scanButton}
          onPress={() => setShowScanner(true)}
        >
          <Text style={styles.scanButtonText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {barcodeError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {barcodeError}
        </Text>
      )}

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(p) => p.id}
          style={styles.resultsList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultRow} onPress={() => handleAddProduct(item.id)}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultPrice}>{PESO.format(item.price)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <FlatList
        data={cart}
        keyExtractor={(line) => line.product.id}
        style={styles.cartList}
        contentContainerStyle={cart.length === 0 && styles.emptyCart}
        ListEmptyComponent={<Text style={styles.emptyText}>Cart is empty. Scan or search an item.</Text>}
        renderItem={({ item: line }) => (
          <View style={styles.cartRow}>
            <View style={styles.cartInfo}>
              <Text style={styles.cartName}>{line.product.name}</Text>
              <Text style={styles.cartMeta}>
                {PESO.format(line.product.price)} each · {PESO.format(lineTotal(line.product, line.quantity))}
              </Text>
            </View>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                accessibilityLabel={`Decrease quantity of ${line.product.name}`}
                style={styles.qtyButton}
                onPress={() => setCart((prev) => setQuantity(prev, line.product.id, line.quantity - 1))}
              >
                <Text style={styles.qtyButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{line.quantity}</Text>
              <TouchableOpacity
                accessibilityLabel={`Increase quantity of ${line.product.name}`}
                style={styles.qtyButton}
                onPress={() => setCart((prev) => setQuantity(prev, line.product.id, line.quantity + 1))}
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={`Remove ${line.product.name}`}
                onPress={() => setCart((prev) => removeFromCart(prev, line.product.id))}
              >
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        {!discountEnabled ? (
          <TouchableOpacity onPress={() => setDiscountEnabled(true)}>
            <Text style={styles.discountLink}>+ Add discount</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.discountRow}>
            <View style={styles.discountTypeRow}>
              <TouchableOpacity
                style={[styles.discountTypeButton, discountType === "percentage" && styles.discountTypeButtonOn]}
                onPress={() => setDiscountType("percentage")}
              >
                <Text style={[styles.discountTypeText, discountType === "percentage" && styles.discountTypeTextOn]}>%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.discountTypeButton, discountType === "flat" && styles.discountTypeButtonOn]}
                onPress={() => setDiscountType("flat")}
              >
                <Text style={[styles.discountTypeText, discountType === "flat" && styles.discountTypeTextOn]}>₱</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              accessibilityLabel="Discount value"
              placeholder={discountType === "percentage" ? "10" : "50"}
              keyboardType="decimal-pad"
              value={discountValueText}
              onChangeText={setDiscountValueText}
              style={styles.discountInput}
            />
            <TouchableOpacity
              accessibilityLabel="Remove discount"
              onPress={() => {
                setDiscountEnabled(false);
                setDiscountValueText("");
              }}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {discountAmount > 0 && (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.fieldLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>{PESO.format(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.fieldLabel}>Discount</Text>
              <Text style={styles.discountValue}>−{PESO.format(discountAmount)}</Text>
            </View>
          </>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{PESO.format(total)}</Text>
        </View>

        <SegmentedControl options={PAYMENT_SEGMENTS} value={paymentSegment} onChange={(v) => setPaymentSegment(v as (typeof PAYMENT_SEGMENTS)[number])} style={styles.paymentSegments} />

        {paymentType === "cash" && (
          <>
            <Text style={styles.fieldLabel}>Amount tendered</Text>
            <TextInput
              accessibilityLabel="Amount tendered"
              keyboardType="decimal-pad"
              value={tendered}
              onChangeText={setTendered}
              style={styles.tenderedInput}
            />
            <View style={styles.changeRow}>
              <Text style={styles.changeLabel}>Change</Text>
              <Text style={styles.changeValue}>{change === null ? "—" : PESO.format(change)}</Text>
            </View>
          </>
        )}

        {paymentType === "qr" && (
          <>
            <Text style={styles.fieldLabel}>GCash reference number</Text>
            <TextInput
              accessibilityLabel="GCash reference number"
              placeholder="e.g. 1234567890"
              value={referenceNo}
              onChangeText={setReferenceNo}
              style={styles.tenderedInput}
            />
          </>
        )}

        {paymentType === "credit" && (
          <>
            <Text style={styles.fieldLabel}>Charge to customer</Text>
            {selectedCustomer ? (
              <View style={styles.selectedCustomerRow}>
                <View>
                  <Text style={styles.selectedCustomerName}>{selectedCustomer.name}</Text>
                  <Text style={styles.selectedCustomerBalance}>
                    Current balance: {PESO.format(selectedCustomer.balance)}
                    {selectedCustomer.creditLimit !== null ? ` · limit ${PESO.format(selectedCustomer.creditLimit)}` : ""}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                  <Text style={styles.removeText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  accessibilityLabel="Search by name"
                  placeholder="Search by name"
                  value={customerQuery}
                  onChangeText={setCustomerQuery}
                  style={styles.tenderedInput}
                />
                {customerResults.length > 0 && (
                  <View style={styles.customerResults}>
                    {customerResults.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.resultRow}
                        onPress={() => {
                          setSelectedCustomer(c);
                          setCustomerQuery("");
                        }}
                      >
                        <Text style={styles.resultName}>{c.name}</Text>
                        <Text style={styles.resultPrice}>{PESO.format(c.balance)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
            {creditWarning && (
              <Text accessibilityRole="alert" style={styles.warning}>
                {creditWarning}
              </Text>
            )}
          </>
        )}

        {lastReceiptTotal !== null && (
          <Text accessibilityRole="text" style={styles.success}>
            Sale recorded — {PESO.format(lastReceiptTotal)}. Stock updated.
          </Text>
        )}
        {checkoutError && (
          <Text accessibilityRole="alert" style={styles.error}>
            {checkoutError}
          </Text>
        )}

        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.completeButton, !canComplete && styles.completeButtonDisabled]}
          disabled={!canComplete}
          onPress={handleCompleteSale}
        >
          {checkingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.completeButtonText}>Complete sale</Text>
          )}
        </TouchableOpacity>
      </View>

      <BarcodeScannerModal visible={showScanner} onDetected={handleScanned} onClose={() => setShowScanner(false)} />
    </View>
  );
}

// Kept for reference/parity with SEGMENT_BY_PAYMENT_TYPE if a future
// screen needs to preselect a payment segment from a PaymentType value.
void SEGMENT_BY_PAYMENT_TYPE;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 56 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  storeName: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  cashier: { fontSize: 13, color: "#64748b" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerLink: { fontSize: 12.5, color: "#2563eb", fontWeight: "500" },
  logout: { fontSize: 13, color: "#0f172a", fontWeight: "600" },
  searchRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  scanButton: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  scanButtonText: { color: "#fff", fontWeight: "600" },
  resultsList: { maxHeight: 180, marginHorizontal: 16, marginTop: 8 },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  resultName: { fontSize: 14, color: "#0f172a" },
  resultPrice: { fontSize: 13, color: "#64748b" },
  cartList: { flex: 1, marginTop: 12, paddingHorizontal: 16 },
  emptyCart: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#94a3b8", fontSize: 14 },
  cartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  cartInfo: { flex: 1 },
  cartName: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  cartMeta: { fontSize: 12, color: "#64748b" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonText: { fontSize: 16, color: "#0f172a" },
  qtyValue: { fontSize: 14, width: 20, textAlign: "center" },
  removeText: { fontSize: 12, color: "#dc2626", marginLeft: 4 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    padding: 16,
    paddingBottom: 32,
  },
  discountLink: { fontSize: 13, color: "#2563eb", fontWeight: "600", marginBottom: 10 },
  discountRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  discountTypeRow: { flexDirection: "row", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, overflow: "hidden" },
  discountTypeButton: { paddingHorizontal: 12, paddingVertical: 8 },
  discountTypeButtonOn: { backgroundColor: "#0f172a" },
  discountTypeText: { fontSize: 13, color: "#0f172a" },
  discountTypeTextOn: { color: "#fff" },
  discountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  subtotalValue: { fontSize: 13, color: "#64748b" },
  discountValue: { fontSize: 13, color: "#dc2626" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 14, color: "#64748b" },
  totalValue: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  paymentSegments: { marginTop: 12, marginBottom: 0 },
  fieldLabel: { fontSize: 12, color: "#334155", marginTop: 12, marginBottom: 4 },
  tenderedInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  changeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  changeLabel: { fontSize: 12, color: "#64748b" },
  changeValue: { fontSize: 12, color: "#64748b" },
  customerResults: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, marginTop: 6, maxHeight: 160 },
  selectedCustomerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectedCustomerName: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  selectedCustomerBalance: { fontSize: 12, color: "#64748b", marginTop: 2 },
  warning: { color: "#b45309", fontSize: 12, marginTop: 6 },
  success: { marginTop: 10, color: "#047857", fontSize: 13 },
  error: { color: "#dc2626", fontSize: 13, marginHorizontal: 16, marginBottom: 4 },
  completeButton: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  completeButtonDisabled: { opacity: 0.4 },
  completeButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
