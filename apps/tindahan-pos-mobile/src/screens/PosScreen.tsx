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
import { useStoreData } from "../lib/storeData";
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
import { PESO } from "../lib/money";
import type { CartLine } from "../lib/types";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";

export function PosScreen() {
  const { user, store, logout } = useAuth();
  const { products, loading, error, checkout } = useStoreData();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [tendered, setTendered] = useState("0");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [lastReceiptTotal, setLastReceiptTotal] = useState<number | null>(null);

  const total = useMemo(() => cartTotal(cart), [cart]);
  const searchResults = useMemo(
    () => searchProductsByName(products, searchQuery).slice(0, 8),
    [products, searchQuery]
  );
  const tenderedNumber = Number(tendered);
  const change =
    tendered.trim() !== "" && !Number.isNaN(tenderedNumber) ? computeChange(total, tenderedNumber) : null;

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

  async function handleCompleteSale() {
    if (cart.length === 0 || change === null) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      await checkout(cart, [], user?.name ?? "Cashier", { type: "cash" });
      setLastReceiptTotal(total);
      setCart([]);
      setTendered("0");
      setTimeout(() => setLastReceiptTotal(null), 4000);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Could not complete sale.");
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
          <Text style={styles.cashier}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Sign out</Text>
        </TouchableOpacity>
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
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{PESO.format(total)}</Text>
        </View>

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
          style={[
            styles.completeButton,
            (cart.length === 0 || change === null || checkingOut) && styles.completeButtonDisabled,
          ]}
          disabled={cart.length === 0 || change === null || checkingOut}
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
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 14, color: "#64748b" },
  totalValue: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
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
