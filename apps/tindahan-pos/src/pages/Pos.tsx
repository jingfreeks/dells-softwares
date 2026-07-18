import { lazy, Suspense, useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { useStoreData } from "../lib/storeData";
import {
  addToCart,
  cartTotal,
  computeChange,
  findProductByBarcode,
  removeFromCart,
  searchProductsByName,
  setQuantity,
} from "../lib/pos";
import type { CartLine } from "../lib/types";
import { CameraIcon } from "../components/icons";
import { ScannerLoadingOverlay } from "../components/ScannerLoadingOverlay";
import { V1_1Badge } from "../components/V1_1Badge";

const BarcodeScanner = lazy(() =>
  import("../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);

const PESO = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

interface ServiceLine {
  id: string;
  label: string;
  amount: number;
  fee: number;
}

const SERVICE_TYPES = [
  { key: "eload", label: "E-Load", badge: "L", badgeClass: "bg-violet-100 text-violet-700" },
  { key: "cashin", label: "Cash-in", badge: "In", badgeClass: "bg-emerald-100 text-emerald-700" },
  { key: "cashout", label: "Cash-out", badge: "Out", badgeClass: "bg-amber-100 text-amber-700" },
] as const;

export function Pos() {
  const { user } = useAuth();
  const { products, checkout } = useStoreData();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tendered, setTendered] = useState("");
  const [lastReceiptTotal, setLastReceiptTotal] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "services">("products");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [selectedService, setSelectedService] = useState<(typeof SERVICE_TYPES)[number]["key"]>(
    SERVICE_TYPES[0].key
  );
  const [serviceAmount, setServiceAmount] = useState("");
  const [serviceFee, setServiceFee] = useState("");

  const total = useMemo(
    () => cartTotal(cart) + serviceLines.reduce((sum, l) => sum + l.amount + l.fee, 0),
    [cart, serviceLines]
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

  const tenderedNumber = Number(tendered);
  const change =
    tendered.trim() !== "" && !Number.isNaN(tenderedNumber)
      ? computeChange(total, tenderedNumber)
      : null;

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
    setServiceAmount("");
    setServiceFee("");
  }

  function removeServiceLine(id: string) {
    setServiceLines((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleCompleteSale() {
    if (cart.length === 0 && serviceLines.length === 0) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      if (cart.length > 0) {
        await checkout(cart, user?.name ?? "Cashier");
      }
      setLastReceiptTotal(total);
      setCart([]);
      setServiceLines([]);
      setTendered("");
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
    setTendered("");
  }

  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:h-full lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">POS Checkout</h1>
          <p className="text-sm text-slate-500">Scan a barcode, search by name, or tap a quick item.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "products"
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
                activeTab === "services"
                  ? "bg-[var(--color-brand)] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Services
            </button>
          </div>
          {activeTab === "services" && <V1_1Badge />}
        </div>

        {activeTab === "products" ? (
          <>
            <form onSubmit={handleScan} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <label htmlFor="barcode" className="text-sm font-medium text-slate-700">
                Scan barcode
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="barcode"
                  type="text"
                  placeholder="Scan or type a barcode, then press Enter"
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

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <label htmlFor="search" className="text-sm font-medium text-slate-700">
                Search by name
              </label>
              <input
                id="search"
                type="text"
                placeholder="e.g. sardines"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
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
                        <span className="tabular-nums text-slate-500">{PESO.format(product.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-700">No-barcode quick items</p>
              {categories.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
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
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleQuickItems.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleAddProduct(product.id)}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:border-[var(--color-brand)] hover:bg-[var(--color-brand)]/5"
                  >
                    <span className="block font-medium text-slate-800">{product.name}</span>
                    <span className="tabular-nums text-xs text-slate-500">{PESO.format(product.price)}</span>
                  </button>
                ))}
                {visibleQuickItems.length === 0 && (
                  <p className="text-sm text-slate-400">No quick items in this category.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-3">
              {SERVICE_TYPES.map((service) => (
                <button
                  key={service.key}
                  type="button"
                  onClick={() => setSelectedService(service.key)}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
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
                    <p className="tabular-nums text-xs text-slate-500">{PESO.format(line.product.price)} each</p>
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

          <label htmlFor="tendered" className="mt-3 block text-xs font-medium text-slate-700">
            Amount tendered
          </label>
          <input
            id="tendered"
            type="number"
            min="0"
            inputMode="decimal"
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Change</span>
            <span>{change === null ? "—" : PESO.format(change)}</span>
          </div>

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
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Services are a v1.1 preview — they're included in this receipt's total but not yet
              saved to sales reports. GCash/load transfer still happens on the phone as usual.
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
              disabled={(cart.length === 0 && serviceLines.length === 0) || change === null || checkingOut}
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
