import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  useAuth,
  useStoreData,
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
  searchProductsByName,
  setQuantity,
} from "@/lib/pos";

export const SERVICE_TYPES = [
  { key: "eload", label: SERVICE_LABEL_ELOAD, badge: "L", badgeClass: "bg-violet-100 text-violet-700" },
  { key: "cashin", label: SERVICE_LABEL_CASHIN, badge: "In", badgeClass: "bg-emerald-100 text-emerald-700" },
  { key: "cashout", label: SERVICE_LABEL_CASHOUT, badge: "Out", badgeClass: "bg-amber-100 text-amber-700" },
  { key: "print", label: SERVICE_LABEL_PRINT, badge: "P", badgeClass: "bg-sky-100 text-sky-700" },
] as const;

export type BrowseMode = "scan" | "search" | "quick";
export type PosTab = "products" | "services";

export function usePosPage() {
  const { user } = useAuth();
  const { products, customers, checkout, addCustomer } = useStoreData();
  const packPricingEnabled = useFeatureFlag("pack_pricing");
  const posServicesEnabled = useFeatureFlag("pos_services");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [browseMode, setBrowseMode] = useState<BrowseMode>("scan");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [selectedService, setSelectedService] = useState<(typeof SERVICE_TYPES)[number]["key"]>(
    SERVICE_TYPES[0].key
  );
  const [serviceAmount, setServiceAmount] = useState("0");
  const [serviceFee, setServiceFee] = useState("0");

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Laptop/desktop shortcuts to jump straight into a browse mode without
  // reaching for the mouse — F2 for barcode scan, F3 for name search.
  // Skipped while the barcode-scanner camera overlay is open (it has its
  // own close control) and never fires while the user is already typing
  // in some other field, so it can't clobber in-progress input elsewhere
  // on the page.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "F2" && e.key !== "F3") return;
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement;
      if (isTyping && active !== barcodeInputRef.current && active !== searchInputRef.current) return;
      if (showScanner) return;

      e.preventDefault();
      if (posServicesEnabled) setActiveTab("products");
      if (e.key === "F2") {
        setBrowseMode("scan");
        requestAnimationFrame(() => barcodeInputRef.current?.focus());
      } else {
        setBrowseMode("search");
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [posServicesEnabled, showScanner]);

  const total = useMemo(
    () => cartTotal(cart, packPricingEnabled) + serviceLines.reduce((sum, l) => sum + l.amount + l.fee, 0),
    [cart, serviceLines, packPricingEnabled]
  );
  const searchResults = useMemo(
    () => searchProductsByName(products, searchQuery).slice(0, 6),
    [products, searchQuery]
  );
  const quickItems = useMemo(() => products.filter((p) => p.barcode === null), [products]);
  const categories = useMemo(
    () => Array.from(new Set(quickItems.map((p) => p.category))).sort(),
    [quickItems]
  );
  const visibleQuickItems = useMemo(
    () => (activeCategory === "All" ? quickItems : quickItems.filter((p) => p.category === activeCategory)),
    [quickItems, activeCategory]
  );

  function priceLabel(product: Product) {
    return packPricingEnabled ? packPriceLabel(product) : null;
  }

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
      setBarcodeError(`${ERROR_PRODUCT_NOT_FOUND_BARCODE_PREFIX} "${barcode}".`);
      return;
    }
    setBarcodeError(null);
    setCart((prev) => addToCart(prev, product));
  }

  function handleScan(e: FormEvent) {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;
    addByBarcode(barcode);
    setBarcodeInput("");
  }

  function handleCameraDetected(barcode: string) {
    setShowScanner(false);
    addByBarcode(barcode);
  }

  function handleAddProduct(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prev) => addToCart(prev, product));
    setSearchQuery("");
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

  function focusBarcodeInput() {
    setBrowseMode("scan");
    requestAnimationFrame(() => barcodeInputRef.current?.focus());
  }

  function focusSearchInput() {
    setBrowseMode("search");
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  return {
    cart,
    barcodeInput,
    setBarcodeInput,
    barcodeError,
    searchQuery,
    setSearchQuery,
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
    browseMode,
    setBrowseMode,
    activeCategory,
    setActiveCategory,
    serviceLines,
    selectedService,
    setSelectedService,
    serviceAmount,
    setServiceAmount,
    serviceFee,
    setServiceFee,
    barcodeInputRef,
    searchInputRef,
    total,
    searchResults,
    categories,
    visibleQuickItems,
    priceLabel,
    change,
    selectedCustomer,
    customerResults,
    selectCustomer,
    clearCustomer,
    handleQuickAddCustomer,
    handleScan,
    handleCameraDetected,
    handleAddProduct,
    incrementLine,
    removeLine,
    handleAddService,
    removeServiceLine,
    handleCompleteSale,
    handleCancelSale,
    effectiveTab,
    focusBarcodeInput,
    focusSearchInput,
    packPricingEnabled,
    posServicesEnabled,
  };
}
