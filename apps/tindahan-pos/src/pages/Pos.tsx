import { lazy, Suspense, useMemo, useState } from "react";
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
import { packPriceLabel } from "../lib/inventory";
import { wouldExceedCreditLimit } from "../lib/customers";
import { useFeatureFlag } from "../lib/featureFlags";
import { PESO } from "../lib/money";
import { selectOnFocus } from "../lib/dom";
import type { CartLine, PaymentType, ServiceLine } from "../lib/types";
import { CameraIcon } from "../components/icons";
import { ScannerLoadingOverlay } from "../components/ScannerLoadingOverlay";

const BarcodeScanner = lazy(() =>
  import("../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);

const SERVICE_TYPES = [
  { key: "eload", label: "E-Load", badge: "L", badgeClass: "bg-violet-100 text-violet-700" },
  { key: "cashin", label: "Cash-in", badge: "In", badgeClass: "bg-emerald-100 text-emerald-700" },
  { key: "cashout", label: "Cash-out", badge: "Out", badgeClass: "bg-amber-100 text-amber-700" },
  { key: "print", label: "Print / Photocopy", badge: "P", badgeClass: "bg-sky-100 text-sky-700" },
] as const;

export function Pos() {
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
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [lastReceiptTotal, setLastReceiptTotal] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "services">("products");
  const [browseMode, setBrowseMode] = useState<"scan" | "search" | "quick">("scan");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [selectedService, setSelectedService] = useState<(typeof SERVICE_TYPES)[number]["key"]>(
    SERVICE_TYPES[0].key
  );
  const [serviceAmount, setServiceAmount] = useState("0");
  const [serviceFee, setServiceFee] = useState("0");

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

  function priceLabel(product: (typeof products)[number]) {
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
      setCustomerError(err instanceof Error ? err.message : "Could not add customer.");
    } finally {
      setAddingCustomer(false);
    }
  }

  function addByBarcode(barcode: string) {
    const product = findProductByBarcode(products, barcode);
    if (!product) {
      setBarcodeError(`Product not found for barcode "${barcode}".`);
      return;
    }
    setBarcodeError(null);
    setCart((prev) => addToCart(prev, product));
  }

  function handleScan(e: React.FormEvent) {
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

  async function handleCompleteSale() {
    if (cart.length === 0 && serviceLines.length === 0) return;
    if (paymentType === "credit" && !selectedCustomerId) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      await checkout(cart, serviceLines, user?.name ?? "Cashier", {
        type: paymentType,
        customerId: selectedCustomerId,
      });
      setLastReceiptTotal(total);
      setCart([]);
      setServiceLines([]);
      setTendered("0");
      setPaymentType("cash");
      clearCustomer();
      setTimeout(() => setLastReceiptTotal(null), 4000);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Could not complete sale.");
    } finally {
      setCheckingOut(false);
    }
  }

  function handleCancelSale() {
    setCart([]);
    setServiceLines([]);
    setTendered("0");
    setPaymentType("cash");
    clearCustomer();
  }

  const effectiveTab = posServicesEnabled ? activeTab : "products";

  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:h-full lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">POS Checkout</h1>
          <p className="text-sm text-slate-500">Scan a barcode, search by name, or tap a quick item.</p>
        </div>

        {posServicesEnabled && (
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  effectiveTab === "products"
                    ? "bg-[var(--color-brand)] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Products
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("services")}
                className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  effectiveTab === "services"
                    ? "bg-[var(--color-brand)] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Services
              </button>
            </div>
          </div>
        )}

        {effectiveTab === "products" ? (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setBrowseMode("scan")}
                  className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                    browseMode === "scan"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Scan barcode
                </button>
                <button
                  type="button"
                  onClick={() => setBrowseMode("search")}
                  className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                    browseMode === "search"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Search by name
                </button>
                <button
                  type="button"
                  onClick={() => setBrowseMode("quick")}
                  className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                    browseMode === "quick"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  No-barcode quick items
                </button>
              </div>

              {browseMode === "scan" && (
                <form onSubmit={handleScan} className="mt-3">
                  <label htmlFor="barcode" className="sr-only">
                    Scan barcode
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="barcode"
                      type="text"
                      placeholder="Scan or type a barcode, then press Enter"
                      autoFocus
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                    />
                    <button
                      type="submit"
                      className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      aria-label="Scan with camera"
                      className="flex h-[42px] w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                      <CameraIcon className="h-5 w-5" />
                    </button>
                  </div>
                  {barcodeError && (
                    <p role="alert" className="mt-2 text-sm text-red-600">
                      {barcodeError}
                    </p>
                  )}
                </form>
              )}

              {browseMode === "search" && (
                <div className="mt-3">
                  <label htmlFor="search" className="sr-only">
                    Search by name
                  </label>
                  <input
                    id="search"
                    type="text"
                    placeholder="e.g. sardines"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                  {searchResults.length > 0 && (
                    <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
                      {searchResults.map((product) => (
                        <li key={product.id}>
                          <button
                            type="button"
                            onClick={() => handleAddProduct(product.id)}
                            className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            <span>{product.name}</span>
                            <span className="tabular-nums text-slate-500">
                              {priceLabel(product) ?? PESO.format(product.price)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {browseMode === "quick" && (
                <div className="mt-3">
                  {categories.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {["All", ...categories].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setActiveCategory(cat)}
                          className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            activeCategory === cat
                              ? "bg-[var(--color-brand)] text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex max-h-64 flex-wrap gap-2 overflow-y-auto pr-1">
                    {visibleQuickItems.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleAddProduct(product.id)}
                        className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:border-[var(--color-brand)] hover:bg-[var(--color-brand)]/5"
                      >
                        <span className="block font-medium text-slate-800">{product.name}</span>
                        <span className="tabular-nums text-xs text-slate-500">
                          {priceLabel(product) ?? PESO.format(product.price)}
                        </span>
                      </button>
                    ))}
                    {visibleQuickItems.length === 0 && (
                      <p className="text-sm text-slate-400">No quick items in this category.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SERVICE_TYPES.map((service) => (
                <button
                  key={service.key}
                  type="button"
                  onClick={() => setSelectedService(service.key)}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 transition-colors sm:p-4 ${
                    selectedService === service.key
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)]/5"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${service.badgeClass}`}
                  >
                    {service.badge}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{service.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-900">
                {SERVICE_TYPES.find((s) => s.key === selectedService)?.label}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="svcAmount" className="text-xs font-medium text-slate-700">
                    Amount (₱)
                  </label>
                  <input
                    id="svcAmount"
                    type="number"
                    min="0"
                    value={serviceAmount}
                    onFocus={selectOnFocus}
                    onChange={(e) => setServiceAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
                <div>
                  <label htmlFor="svcFee" className="text-xs font-medium text-slate-700">
                    Fee (₱)
                  </label>
                  <input
                    id="svcFee"
                    type="number"
                    min="0"
                    value={serviceFee}
                    onFocus={selectOnFocus}
                    onChange={(e) => setServiceFee(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddService}
                disabled={!serviceAmount || Number(serviceAmount) <= 0}
                className="mt-3 cursor-pointer rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add to cart
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Current sale{cart.length + serviceLines.length > 0 && ` (${cart.length + serviceLines.length} items)`}
          </h2>
        </div>

        <div className="p-4 lg:flex-1 lg:overflow-y-auto">
          {cart.length === 0 && serviceLines.length === 0 ? (
            <p className="text-sm text-slate-400">Cart is empty. Scan or search an item to begin.</p>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Cart items">
              {cart.map((line) => (
                <li key={line.product.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{line.product.name}</p>
                    <p className="tabular-nums text-xs text-slate-500">
                      {priceLabel(line.product) ?? `${PESO.format(line.product.price)} each`} ·{" "}
                      {PESO.format(lineTotal(line.product, line.quantity, packPricingEnabled))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${line.product.name}`}
                      onClick={() =>
                        setCart((prev) => setQuantity(prev, line.product.id, line.quantity - 1))
                      }
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded border border-slate-300 text-base hover:bg-slate-100"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${line.product.name}`}
                      onClick={() =>
                        setCart((prev) => setQuantity(prev, line.product.id, line.quantity + 1))
                      }
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded border border-slate-300 text-base hover:bg-slate-100"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${line.product.name}`}
                      onClick={() => setCart((prev) => removeFromCart(prev, line.product.id))}
                      className="flex h-11 min-w-11 cursor-pointer items-center justify-center px-2 text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
              {serviceLines.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg bg-[var(--color-brand)]/5 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{line.label}</p>
                    <p className="text-xs text-slate-500">Service</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-sm font-medium text-slate-800">
                      {PESO.format(line.amount + line.fee)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${line.label}`}
                      onClick={() => removeServiceLine(line.id)}
                      className="flex h-11 min-w-11 cursor-pointer items-center justify-center px-2 text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Total</span>
            <span
              data-testid="cart-total"
              className="tabular-nums text-lg font-semibold text-slate-900"
            >
              {PESO.format(total)}
            </span>
          </div>

          <div className="mt-3 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                setPaymentType("cash");
                clearCustomer();
              }}
              className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                paymentType === "cash"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("credit")}
              className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                paymentType === "credit"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Utang
            </button>
          </div>

          {paymentType === "cash" ? (
            <>
              <label htmlFor="tendered" className="mt-3 block text-xs font-medium text-slate-700">
                Amount tendered
              </label>
              <input
                id="tendered"
                type="number"
                min="0"
                inputMode="decimal"
                value={tendered}
                onFocus={selectOnFocus}
                onChange={(e) => setTendered(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>Change</span>
                <span>{change === null ? "—" : PESO.format(change)}</span>
              </div>
            </>
          ) : (
            <div className="mt-3">
              {selectedCustomer ? (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{selectedCustomer.name}</p>
                      <p className="text-xs text-slate-500">
                        Current balance: {PESO.format(selectedCustomer.balance)}
                        {selectedCustomer.creditLimit !== null &&
                          ` · limit ${PESO.format(selectedCustomer.creditLimit)}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearCustomer}
                      className="cursor-pointer text-xs font-medium text-[var(--color-brand)] hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  {wouldExceedCreditLimit(selectedCustomer, total) && (
                    <p className="mt-2 text-xs text-amber-600">
                      This sale would put {selectedCustomer.name} over their{" "}
                      {PESO.format(selectedCustomer.creditLimit ?? 0)} credit limit — not blocked, just a
                      heads up.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <label htmlFor="customerSearch" className="text-xs font-medium text-slate-700">
                    Charge to customer
                  </label>
                  <input
                    id="customerSearch"
                    type="text"
                    placeholder="Search by name…"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                  {customerResults.length > 0 && (
                    <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
                      {customerResults.map((customer) => (
                        <li key={customer.id}>
                          <button
                            type="button"
                            onClick={() => selectCustomer(customer.id)}
                            className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            <span>{customer.name}</span>
                            <span className="tabular-nums text-xs text-slate-500">
                              {PESO.format(customer.balance)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {customerQuery.trim() !== "" && customerResults.length === 0 && (
                    <button
                      type="button"
                      onClick={handleQuickAddCustomer}
                      disabled={addingCustomer}
                      className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {addingCustomer ? "Adding…" : `+ Add "${customerQuery.trim()}" as a new customer`}
                    </button>
                  )}
                  {customerError && (
                    <p role="alert" className="mt-2 text-sm text-red-600">
                      {customerError}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {lastReceiptTotal !== null && (
            <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Sale recorded — {PESO.format(lastReceiptTotal)}. Stock updated.
            </p>
          )}

          {checkoutError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {checkoutError}
            </p>
          )}

          {serviceLines.length > 0 && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Services are recorded with this sale for reporting. The GCash/load transfer itself
              still happens on the phone as usual.
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleCancelSale}
              disabled={(cart.length === 0 && serviceLines.length === 0) || checkingOut}
              className="flex-1 cursor-pointer rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel sale
            </button>
            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={
                (cart.length === 0 && serviceLines.length === 0) ||
                (paymentType === "cash" ? change === null : !selectedCustomerId) ||
                checkingOut
              }
              className="flex-1 cursor-pointer rounded-lg bg-[var(--color-brand)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {checkingOut ? "Processing…" : "Complete sale"}
            </button>
          </div>
        </div>
      </div>

      {showScanner && (
        <Suspense fallback={<ScannerLoadingOverlay />}>
          <BarcodeScanner onDetected={handleCameraDetected} onClose={() => setShowScanner(false)} />
        </Suspense>
      )}
    </div>
  );
}
