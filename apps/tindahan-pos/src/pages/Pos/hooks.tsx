import { describePlatformError } from "@/lib/platformErrors";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  useAuth,
  useCashierSession,
  useStoreData,
  useEloadWallet,
  useDrawerFloat,
  packPriceLabel,
  useFeatureFlag,
  useFeature,
  computeDiscountAmount,
  wouldExceedCreditLimit,
  ERROR_PRODUCT_NOT_FOUND_BARCODE_PREFIX,
  ERROR_COULD_NOT_ADD_CUSTOMER,
  ERROR_COULD_NOT_COMPLETE_SALE,
  ERROR_INVALID_DISCOUNT_VALUE,
  ERROR_CASH_OUT_CAP_EXCEEDED,
  ERROR_COULD_NOT_HOLD_SALE,
  ERROR_RESUME_BLOCKED_CART_NOT_EMPTY,
  TEXT_CASHIER_SESSION_EXPIRED,
  TEXT_STORE_SUSPENDED,
  SERVICE_LABEL_ELOAD,
  SERVICE_LABEL_CASHIN,
  SERVICE_LABEL_CASHOUT,
  SERVICE_LABEL_PRINT,
  holdSale,
  listHeldSales,
  removeHeldSale,
  heldSaleHasIrreversibleService,
  type CartLine,
  type PaymentType,
  type ServiceLine,
  type Product,
  type SaleRecord,
  type HeldSale,
  type Discount,
} from "@/lib";
import {
  addToCart,
  cartTotal,
  clearPendingSale,
  computeChange,
  findProductByBarcode,
  findInsufficientStock,
  formatInsufficientStockMessage,
  loadPendingSale,
  removeFromCart,
  savePendingSale,
  setQuantity,
  suggestedCashAmounts,
} from "@/lib/pos";
import {
  loadReceiptSettingsMock,
  DEFAULT_RECEIPT_SETTINGS_MOCK,
} from "@/pages/Settings/receiptSettingsMock";
import { useOverrideApproval } from "./useOverrideApproval";

export const SERVICE_TYPES = [
  { key: "eload", label: SERVICE_LABEL_ELOAD, badge: "L", badgeClass: "bg-violet-100 text-violet-700" },
  { key: "cashin", label: SERVICE_LABEL_CASHIN, badge: "In", badgeClass: "bg-emerald-100 text-emerald-700" },
  { key: "cashout", label: SERVICE_LABEL_CASHOUT, badge: "Out", badgeClass: "bg-amber-100 text-amber-700" },
  { key: "print", label: SERVICE_LABEL_PRINT, badge: "P", badgeClass: "bg-sky-100 text-sky-700" },
] as const;

export type PosTab = "products" | "services";

export function usePosPage() {
  const { user, store } = useAuth();
  const { activeCashier, cashierToken, endCashierSession, reportExpiredSession } = useCashierSession();
  const {
    products,
    customers,
    checkout,
    addCustomer,
    loading: storeDataLoading,
    error: storeDataError,
    refresh: refreshStoreData,
  } = useStoreData();
  const { balance: walletBalance, deduct: deductWallet } = useEloadWallet();
  const { balance: drawerBalance, add: addToDrawer, deduct: deductFromDrawer } = useDrawerFloat();
  const packPricingEnabled = useFeatureFlag("pack_pricing");
  const posServicesEnabled = useFeatureFlag("pos_services");
  // useFeature() fails open while loading/on error — a UX gate only, since
  // checkout_sale() itself enforces pos.discounts server-side (the real
  // boundary), so a stale "enabled" read here can never actually apply an
  // unpaid discount.
  const discountsEnabled = useFeature("pos.discounts");
  const [discountType, setDiscountType] = useState<Discount["type"] | null>(null);
  const [discountValue, setDiscountValue] = useState("");
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
  const [lastSaleRecord, setLastSaleRecord] = useState<SaleRecord | null>(null);
  const [lastSaleTendered, setLastSaleTendered] = useState(0);
  const [lastSaleChange, setLastSaleChange] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // A separate PIN gate from the credit-limit one above: this one opens
  // only after checkout_sale() itself rejects with CASH_OUT_CAP_EXCEEDED
  // (20260903200000) -- there's no reliable client-side pre-check the way
  // wouldExceedCreditLimit() is for credit, since the cap is compared
  // against cash_handed_over summed across this sale's cash-out lines,
  // which only the server (not this component) sums authoritatively.
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState<PosTab>("products");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [heldSalesOpen, setHeldSalesOpen] = useState(false);
  const [closeShiftOpen, setCloseShiftOpen] = useState(false);
  const [holdingSale, setHoldingSale] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<(typeof SERVICE_TYPES)[number]["key"]>(
    SERVICE_TYPES[0].key
  );

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

  const restoredPendingSaleRef = useRef(false);

  // Recovers an in-progress sale after the page reloads mid-checkout — most
  // commonly the browser discarding this tab in the background and
  // reloading it fresh once the cashier switches back, which would
  // otherwise silently wipe the cart. Waits for store data to finish
  // loading so product ids in the saved snapshot can actually be resolved
  // (product isn't in `products` yet during the initial fetch); if that
  // never resolves — a store with no products — it can't restore anyway,
  // so nothing is lost by trying only once.
  useEffect(() => {
    if (restoredPendingSaleRef.current || !user || storeDataLoading) return;
    restoredPendingSaleRef.current = true;
    const snapshot = loadPendingSale(user.id);
    if (!snapshot) return;

    const restoredCart = snapshot.cartLines
      .map((line) => {
        const product = products.find((p) => p.id === line.productId);
        return product ? { product, quantity: line.quantity } : null;
      })
      .filter((line): line is CartLine => line !== null);
    if (restoredCart.length > 0) setCart(restoredCart);
    if (snapshot.serviceLines.length > 0) setServiceLines(snapshot.serviceLines);
    if (snapshot.selectedCustomerId && customers.some((c) => c.id === snapshot.selectedCustomerId)) {
      setSelectedCustomerId(snapshot.selectedCustomerId);
    }
  }, [user, storeDataLoading, products, customers]);

  // Keep the snapshot current as the sale changes, and drop it once
  // there's nothing left to recover (a completed or cancelled sale
  // already clears cart/serviceLines/selectedCustomerId, which lands here).
  useEffect(() => {
    if (!restoredPendingSaleRef.current || !user) return;
    if (cart.length === 0 && serviceLines.length === 0 && !selectedCustomerId) {
      clearPendingSale(user.id);
      return;
    }
    savePendingSale(user.id, {
      cartLines: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      serviceLines,
      selectedCustomerId,
    });
  }, [cart, serviceLines, selectedCustomerId, user]);

  // Held sales are store-wide (any cashier at the store can resume any of
  // them), so this loads on mount/store-change rather than per-cashier.
  useEffect(() => {
    if (!store) return;
    void listHeldSales(store.id).then(setHeldSales);
  }, [store]);

  const subtotal = useMemo(
    () => cartTotal(cart, packPricingEnabled) + serviceLines.reduce((sum, l) => sum + l.amount + l.fee, 0),
    [cart, serviceLines, packPricingEnabled]
  );
  const discount: Discount | null = useMemo(() => {
    if (!discountsEnabled || !discountType) return null;
    const value = Number(discountValue);
    if (!value || value <= 0) return null;
    return { type: discountType, value };
  }, [discountsEnabled, discountType, discountValue]);
  const discountAmount = useMemo(() => computeDiscountAmount(subtotal, discount), [subtotal, discount]);
  const total = subtotal - discountAmount;
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

  const receiptSettings = useMemo(
    () => (store ? loadReceiptSettingsMock(store.id) : DEFAULT_RECEIPT_SETTINGS_MOCK),
    [store]
  );

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
      setCustomerError(describePlatformError(err, ERROR_COULD_NOT_ADD_CUSTOMER));
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

  // Same rationale as the e-load wallet above: the drawer's cash moves
  // the moment the cashier hands over or collects it for the service,
  // not at final checkout, and isn't reversed if the line is later
  // removed.
  function addCashInService(label: string, amount: number, fee: number) {
    setServiceLines((prev) => [...prev, { id: `svc-${Date.now()}`, label, amount, fee }]);
    addToDrawer(amount + fee);
  }

  // A cash-out customer pays nothing to the till — only the fee is real
  // sale revenue, so that's what the line is worth for reporting. The
  // actual cash handed over comes out of the drawer separately.
  function addCashOutService(label: string, feeRevenue: number, cashHandedOver: number) {
    setServiceLines((prev) => [
      ...prev,
      {
        id: `svc-${Date.now()}`,
        label,
        amount: feeRevenue,
        fee: 0,
        // Tags this line for checkout_sale()'s cashier_cash_out_cap check
        // (20260903200000) -- the server sums cashHandedOver across
        // serviceType "cashout" lines, since amount/fee only ever carry the
        // (uncapped) fee revenue, never the cash actually handed over.
        serviceType: "cashout",
        cashHandedOver,
      },
    ]);
    deductFromDrawer(cashHandedOver);
  }

  function addPrintService(label: string, amount: number, fee: number) {
    setServiceLines((prev) => [...prev, { id: `svc-${Date.now()}`, label, amount, fee }]);
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

  function resetSaleState() {
    setCart([]);
    setServiceLines([]);
    setTendered("0");
    setPaymentType("cash");
    setReferenceNo("");
    clearCustomer();
    setDiscountType(null);
    setDiscountValue("");
  }

  async function runCheckout(overridePinValue?: string) {
    const saleRecord = await checkout(
      cart,
      serviceLines,
      activeCashier?.name ?? user?.name ?? "Cashier",
      {
        type: paymentType,
        customerId: selectedCustomerId,
        ...(paymentType === "qr" ? { referenceNo: referenceNo.trim() } : {}),
        ...(overridePinValue ? { overridePin: overridePinValue } : {}),
      },
      cashierToken,
      discount
    );
    // Capture tendered/change before resetSaleState() clears them — the
    // receipt needs both, and neither is part of SaleRecord.
    setLastSaleTendered(paymentType === "cash" ? tenderedNumber : 0);
    setLastSaleChange(paymentType === "cash" ? (change ?? 0) : 0);
    setLastSaleRecord(saleRecord);
    setLastReceiptTotal(total);
    resetSaleState();
    setTimeout(() => setLastReceiptTotal(null), 4000);
  }

  function closeReceipt() {
    setLastSaleRecord(null);
  }

  function openCloseShift() {
    setCloseShiftOpen(true);
  }

  function closeCloseShift() {
    setCloseShiftOpen(false);
  }

  async function confirmCloseShift(closingFloat: number) {
    await endCashierSession(closingFloat);
    setCloseShiftOpen(false);
  }

  async function skipCloseShift() {
    await endCashierSession();
    setCloseShiftOpen(false);
  }

  async function handleCompleteSale() {
    if (cart.length === 0 && serviceLines.length === 0) return;
    if (paymentType === "credit" && !selectedCustomerId) return;
    if (paymentType === "qr" && !referenceNo.trim()) return;
    // checkout_sale() rejects a >100% discount outright (see
    // generic_discount migration) -- caught here for instant UX, same as
    // the credit-limit/insufficient-stock checks below. Without this, the
    // rejection only surfaced after the RPC round trip, and (until the
    // offline queue's connectivity classifier learned about
    // INVALID_DISCOUNT_VALUE) was misclassified as a dropped connection and
    // queued as if the sale had gone through.
    if (discount?.type === "percentage" && discount.value > 100) {
      setCheckoutError(ERROR_INVALID_DISCOUNT_VALUE);
      return;
    }
    const insufficientLines = findInsufficientStock(cart);
    if (insufficientLines.length > 0) {
      setCheckoutError(formatInsufficientStockMessage(insufficientLines));
      return;
    }
    // A credit sale that would exceed the customer's limit needs an
    // authorized admin's PIN before it can go through — checked here for
    // instant UX, and re-verified server-side inside checkout_sale() itself
    // (the source of truth, since this client-side check could be stale).
    if (paymentType === "credit" && selectedCustomer && wouldExceedCreditLimit(selectedCustomer, total)) {
      ownerApproval.openDialog();
      return;
    }
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      await runCheckout();
    } catch (err) {
      const message = describePlatformError(err, ERROR_COULD_NOT_COMPLETE_SALE);
      if (message.includes("EXPIRED_CASHIER_SESSION")) {
        reportExpiredSession();
        setCheckoutError(TEXT_CASHIER_SESSION_EXPIRED);
      } else if (message.includes("ORG_WRITES_SUSPENDED")) {
        // The billing banner is shown to admins only and never on a paired
        // device, so a cashier has no other way to learn why the till stopped
        // taking sales.
        setCheckoutError(TEXT_STORE_SUSPENDED);
      } else if (message.includes("CASH_OUT_CAP_EXCEEDED")) {
        // Discovered only from the server's rejection -- see the state
        // declaration above for why there's no client-side pre-check here.
        cashOutApproval.openDialog();
      } else {
        setCheckoutError(message);
      }
    } finally {
      setCheckingOut(false);
    }
  }

  // Two dialogs, one flow. See useOverrideApproval for why they are not two
  // near-identical copies any more.
  const ownerApproval = useOverrideApproval({
    onApprove: (pin) => runCheckout(pin),
    onSessionExpired: () => {
      reportExpiredSession();
      setCheckoutError(TEXT_CASHIER_SESSION_EXPIRED);
    },
    onStoreSuspended: () => setCheckoutError(TEXT_STORE_SUSPENDED),
  });

  const cashOutApproval = useOverrideApproval({
    onApprove: (pin) => runCheckout(pin),
    // A still-over-cap retry (the owner mis-typed, say) belongs in the dialog
    // rather than closing it.
    describeRefusal: (message) =>
      message.includes("CASH_OUT_CAP_EXCEEDED") ? ERROR_CASH_OUT_CAP_EXCEEDED : null,
    onSessionExpired: () => {
      reportExpiredSession();
      setCheckoutError(TEXT_CASHIER_SESSION_EXPIRED);
    },
    onStoreSuspended: () => setCheckoutError(TEXT_STORE_SUSPENDED),
  });

  function payCashInstead() {
    setPaymentType("cash");
    ownerApproval.close();
  }

  function handleCancelSale() {
    resetSaleState();
  }

  function openHeldSales() {
    setHeldSalesOpen(true);
  }

  function closeHeldSales() {
    setHeldSalesOpen(false);
  }

  async function holdCurrentSale() {
    if (cart.length === 0 && serviceLines.length === 0) return;
    if (!store) return;
    setHoldingSale(true);
    setHoldError(null);
    try {
      const saved = await holdSale(store.id, {
        cartLines: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        serviceLines,
        paymentType,
        tendered,
        referenceNo,
        selectedCustomerId,
        note: null,
        heldByCashierId: activeCashier?.id ?? null,
        heldByName: activeCashier?.name ?? user?.name ?? "Cashier",
      });
      setHeldSales((prev) => [...prev, saved]);
      resetSaleState();
    } catch {
      // A failed hold must not clear the cart — the customer's order would
      // otherwise vanish with nothing recorded anywhere.
      setHoldError(ERROR_COULD_NOT_HOLD_SALE);
    } finally {
      setHoldingSale(false);
    }
  }

  async function resumeHeldSale(id: string) {
    if (cart.length > 0 || serviceLines.length > 0) {
      setResumeError(ERROR_RESUME_BLOCKED_CART_NOT_EMPTY);
      return;
    }
    const held = heldSales.find((h) => h.id === id);
    if (!held || !store) return;

    const restoredCart = held.cartLines
      .map((line) => {
        const product = products.find((p) => p.id === line.productId);
        return product ? { product, quantity: line.quantity } : null;
      })
      .filter((line): line is CartLine => line !== null);

    setCart(restoredCart);
    setServiceLines(held.serviceLines);
    setPaymentType(held.paymentType);
    setTendered(held.tendered);
    setReferenceNo(held.referenceNo);
    if (held.selectedCustomerId && customers.some((c) => c.id === held.selectedCustomerId)) {
      setSelectedCustomerId(held.selectedCustomerId);
    }

    await removeHeldSale(store.id, id);
    setHeldSales((prev) => prev.filter((h) => h.id !== id));
    setHeldSalesOpen(false);
    setResumeError(null);
  }

  async function discardHeldSale(id: string) {
    if (!store) return;
    await removeHeldSale(store.id, id);
    setHeldSales((prev) => prev.filter((h) => h.id !== id));
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
    productInputRef,
    subtotal,
    total,
    discountsEnabled,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    discountAmount,
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
    heldSaleHasIrreversibleService,
    // Mapped rather than spread: the page's prop names are unchanged, so no
    // component moved for this refactor.
    ownerApprovalOpen: ownerApproval.open,
    overridePin: ownerApproval.pin,
    setOverridePin: ownerApproval.setPin,
    overridePinError: ownerApproval.error,
    overrideSubmitting: ownerApproval.submitting,
    closeOwnerApproval: ownerApproval.close,
    payCashInstead,
    submitOwnerApproval: ownerApproval.submit,
    cashOutApprovalOpen: cashOutApproval.open,
    cashOutOverridePin: cashOutApproval.pin,
    setCashOutOverridePin: cashOutApproval.setPin,
    cashOutOverridePinError: cashOutApproval.error,
    cashOutOverrideSubmitting: cashOutApproval.submitting,
    closeCashOutApproval: cashOutApproval.close,
    submitCashOutApproval: cashOutApproval.submit,
    effectiveTab,
    focusProductInput,
    packPricingEnabled,
    posServicesEnabled,
    activeCashier,
    switchCashier: openCloseShift,
    closeShiftOpen,
    closeCloseShift,
    confirmCloseShift,
    skipCloseShift,
    productsLoading: storeDataLoading,
    productsError: storeDataError,
    onRetryProducts: refreshStoreData,
    store,
    lastSaleRecord,
    lastSaleTendered,
    lastSaleChange,
    receiptSettings,
    receiptTin: store?.tin ?? undefined,
    receiptBusinessPermitNo: store?.businessPermitNo ?? undefined,
    closeReceipt,
  };
}
