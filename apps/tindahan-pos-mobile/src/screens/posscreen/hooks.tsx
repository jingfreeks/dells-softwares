import { useMemo, useState } from "react";
import { useAuth } from "../../lib/auth";
import { useCashierSession } from "../../lib/cashierSession";
import { useStoreData, type CheckoutDiscount, type CheckoutPayment } from "../../lib/storeData";
import { addToCart, cartTotal, computeChange, findProductByBarcode, setQuantity } from "../../lib/pos";
import { computeDiscountAmount } from "../../lib/discount";
import { wouldExceedCreditLimit } from "../../lib/customers";
import type { CartLine, Customer, PaymentType, Product } from "../../lib/types";

export const PAYMENT_SEGMENTS = ["Cash", "GCash", "Utang"] as const;
export const PAYMENT_TYPE_BY_SEGMENT: Record<(typeof PAYMENT_SEGMENTS)[number], PaymentType> = {
  Cash: "cash",
  GCash: "qr",
  Utang: "credit",
};
export const ALL_CATEGORY = "__all__";

/** All state + logic for PosScreen -- PosScreen.tsx stays presentational. */
export function usePosScreen() {
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

  function incrementLine(productId: string) {
    const line = cart.find((l) => l.product.id === productId);
    if (line) setCart((prev) => setQuantity(prev, productId, line.quantity + 1));
  }

  function decrementLine(productId: string) {
    const line = cart.find((l) => l.product.id === productId);
    if (line) setCart((prev) => setQuantity(prev, productId, line.quantity - 1));
  }

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setCustomerQuery("");
  }

  return {
    user,
    device,
    store,
    logout,
    activeCashier,
    endCashierSession,
    products,
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
  };
}
