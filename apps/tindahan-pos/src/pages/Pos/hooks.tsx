import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  useAuth,
  useStoreData,
  useEloadWallet,
  packPriceLabel,
  useFeatureFlag,
  ERROR_PRODUCT_NOT_FOUND_BARCODE_PREFIX,
  ERROR_COULD_NOT_ADD_CUSTOMER,
  ERROR_COULD_NOT_COMPLETE_SALE,
  SERVICE_LABEL_ELOAD,
  SERVICE_LABEL_CASHIN,
  SERVICE_LABEL_CASHOUT,
  SERVICE_LABEL_PRINT,
  type CartLine,
  type PaymentType,
  type ServiceLine,
  type Product,
} from "@/lib";
import {
  addToCart,
  cartTotal,
  computeChange,
  findProductByBarcode,
  removeFromCart,
  setQuantity,
  suggestedCashAmounts,
} from "@/lib/pos";

export const SERVICE_TYPES = [
  { key: "eload", label: SERVICE_LABEL_ELOAD, badge: "L", badgeClass: "bg-violet-100 text-violet-700" },
  { key: "cashin", label: SERVICE_LABEL_CASHIN, badge: "In", badgeClass: "bg-emerald-100 text-emerald-700" },
  { key: "cashout", label: SERVICE_LABEL_CASHOUT, badge: "Out", badgeClass: "bg-amber-100 text-amber-700" },
  { key: "print", label: SERVICE_LABEL_PRINT, badge: "P", badgeClass: "bg-sky-100 text-sky-700" },
] as const;

export type PosTab = "products" | "services";

export function usePosPage() {
  const { user } = useAuth();
  const { products, customers, checkout, addCustomer } = useStoreData();
  const { balance: walletBalance, deduct: deductWallet } = useEloadWallet();
  const packPricingEnabled = useFeatureFlag("pack_pricing");
  const posServicesEnabled = useFeatureFlag("pos_services");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tendered, setTendered] = useState("0");
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [lastReceiptTotal, setLastReceiptTotal] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState<PosTab>("products");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [selectedService, setSelectedService] = useState<(typeof SERVICE_TYPES)[number]["key"]>(
    SERVICE_TYPES[0].key
  );
  const [serviceAmount, setServiceAmount] = useState("0");
  const [serviceFee, setServiceFee] = useState("0");

  const productInputRef = useRef<HTMLInputElement>(null);

  // Laptop/desktop shortcut to jump straight into the scan/search field
  // without reaching for the mouse. Skipped while the barcode-scanner
  // camera overlay is open (it has its own close control) and never fires
  // while the user is already typing in some other field, so it can't
  // clobber in-progress input elsewhere on the page.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "F2" && e.key !== "F3") return;
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement;
      if (isTyping && active !== productInputRef.current) return;
      if (showScanner) return;

      e.preventDefault();
      if (posServicesEnabled) setActiveTab("products");
      productInputRef.current?.focus();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [posServicesEnabled, showScanner]);

  const total = useMemo(
    () => cartTotal(cart, packPricingEnabled) + serviceLines.reduce((sum, l) => sum + l.amount + l.fee, 0),
    [cart, serviceLines, packPricingEnabled]
  );
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))).sort(), [products]);
  const visibleProducts = useMemo(() => {
    const byCategory = activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory);
    const q = productQuery.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode ?? "").includes(q));
  }, [products, activeCategory, productQuery]);
  const cartQuantityByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart) map.set(line.product.id, line.quantity);
    return map;
  }, [cart]);

  function priceLabel(product: Product) {
    return packPricingEnabled ? packPriceLabel(product) : null;
  }

  const quickCashAmounts = useMemo(() => suggestedCashAmounts(total), [total]);

  const tenderedNumber = Number(tendered);
  const change =
    tendered.trim() !== "" && !Number.isNaN(tenderedNumber)
      ? computeChange(total, tenderedNumber)
      : null;

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null;
  const customerResults = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [customers, customerQuery]);

  function selectCustomer(id: string) {
    setSelectedCustomerId(id);
    setCustomerQuery("");
    setCustomerError(null);
  }

  function clearCustomer() {
    setSelectedCustomerId(null);
    setCustomerQuery("");
  }

  async function handleQuickAddCustomer() {
    const name = customerQuery.trim();
    if (!name) return;
    setAddingCustomer(true);
    setCustomerError(null);
    try {
      const customer = await addCustomer(name);
      selectCustomer(customer.id);
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : ERROR_COULD_NOT_ADD_CUSTOMER);
    } finally {
      setAddingCustomer(false);
    }
  }

  function addByBarcode(barcode: string) {
    const product = findProductByBarcode(products, barcode);
    if (!product) {
      setSearchError(`${ERROR_PRODUCT_NOT_FOUND_BARCODE_PREFIX} "${barcode}".`);
      return;
    }
    setSearchError(null);
    setCart((prev) => addToCart(prev, product));
  }

  // The field doubles as a barcode scanner and a name search. On Enter: an
  // exact barcode match wins first (mirrors a physical scanner firing
  // Enter after its keystrokes); otherwise, if the current filter narrowed
  // the grid to exactly one product, add that one. A digits-only query
  // that matches nothing is treated as a failed barcode scan and surfaces
  // an error — anything else is just an in-progress name search, so it
  // stays silent rather than flashing a false "not found".
  function handleProductQuerySubmit(e: FormEvent) {
    e.preventDefault();
    const query = productQuery.trim();
    if (!query) return;
    const byBarcode = findProductByBarcode(products, query);
    if (byBarcode) {
      setSearchError(null);
      setCart((prev) => addToCart(prev, byBarcode));
      setProductQuery("");
      return;
    }
    if (visibleProducts.length === 1) {
      setSearchError(null);
      setCart((prev) => addToCart(prev, visibleProducts[0]));
      setProductQuery("");
      return;
    }
    if (/^\d+$/.test(query)) {
      setSearchError(`${ERROR_PRODUCT_NOT_FOUND_BARCODE_PREFIX} "${query}".`);
    }
  }

  function handleCameraDetected(barcode: string) {
    setShowScanner(false);
    addByBarcode(barcode);
  }

  function handleAddProduct(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prev) => addToCart(prev, product));
  }

  function openCustomItem() {
    setCustomItemOpen(true);
  }

  function cancelCustomItem() {
    setCustomItemOpen(false);
    setCustomItemName("");
    setCustomItemPrice("");
  }

  // A custom item has no product record to decrement stock for, so it
  // rides in as a service line (fee 0) rather than a cart line — the
  // checkout RPC already accepts arbitrary label/amount pairs there
  // without needing a real product id.
  function submitCustomItem(e: FormEvent) {
    e.preventDefault();
    const name = customItemName.trim();
    const price = Number(customItemPrice);
    if (!name || !price || price <= 0) return;
    setServiceLines((prev) => [...prev, { id: `custom-${Date.now()}`, label: name, amount: price, fee: 0 }]);
    cancelCustomItem();
  }

  function incrementLine(productId: string, quantity: number) {
    setCart((prev) => setQuantity(prev, productId, quantity));
  }

  function removeLine(productId: string) {
    setCart((prev) => removeFromCart(prev, productId));
  }

  function handleAddService() {
    const amount = Number(serviceAmount);
    if (!amount || amount <= 0) return;
    const fee = Number(serviceFee) || 0;
    const service = SERVICE_TYPES.find((s) => s.key === selectedService)!;
    const label = fee > 0 ? `${service.label} ₱${amount} + ₱${fee} fee` : `${service.label} ₱${amount}`;
    setServiceLines((prev) => [...prev, { id: `svc-${Date.now()}`, label, amount, fee }]);
    setServiceAmount("0");
    setServiceFee("0");
  }

  function removeServiceLine(id: string) {
    setServiceLines((prev) => prev.filter((l) => l.id !== id));
  }

  // The e-load float is spent the moment the cashier sends the load —
  // same as in real life, before the customer has necessarily paid —
  // so the wallet deducts here, not at final checkout, and isn't
  // refunded if the line is later removed (an actual load can't be
  // unsent either).
  function addEloadService(label: string, amount: number, fee: number) {
    setServiceLines((prev) => [...prev, { id: `svc-${Date.now()}`, label, amount, fee }]);
    deductWallet(amount);
  }

  function selectPaymentType(type: PaymentType) {
    setPaymentType(type);
    if (type === "cash") {
      setReferenceNo("");
      clearCustomer();
    } else if (type === "qr") {
      clearCustomer();
    } else {
      setReferenceNo("");
    }
  }

  async function handleCompleteSale() {
    if (cart.length === 0 && serviceLines.length === 0) return;
    if (paymentType === "credit" && !selectedCustomerId) return;
    if (paymentType === "qr" && !referenceNo.trim()) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      await checkout(cart, serviceLines, user?.name ?? "Cashier", {
        type: paymentType,
        customerId: selectedCustomerId,
        ...(paymentType === "qr" ? { referenceNo: referenceNo.trim() } : {}),
      });
      setLastReceiptTotal(total);
      setCart([]);
      setServiceLines([]);
      setTendered("0");
      setPaymentType("cash");
      setReferenceNo("");
      clearCustomer();
      setTimeout(() => setLastReceiptTotal(null), 4000);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : ERROR_COULD_NOT_COMPLETE_SALE);
    } finally {
      setCheckingOut(false);
    }
  }

  function handleCancelSale() {
    setCart([]);
    setServiceLines([]);
    setTendered("0");
    setPaymentType("cash");
    setReferenceNo("");
    clearCustomer();
  }

  const effectiveTab: PosTab = posServicesEnabled ? activeTab : "products";

  function focusProductInput() {
    productInputRef.current?.focus();
  }

  return {
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
    focusProductInput,
    packPricingEnabled,
    posServicesEnabled,
  };
}
