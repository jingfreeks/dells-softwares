import { useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useStoreData } from "../lib/storeData";
import { SearchIcon } from "./icons";

const MAX_RESULTS_PER_GROUP = 4;

/**
 * Quick search across products and customers already held in the store
 * data context — no extra fetch, just a client-side filter over data the
 * app already loaded. Picking a result (or pressing Enter) hands the
 * matched page a starting query via router state, so it opens already
 * filtered instead of dropping the admin on an empty list.
 */
export function Topbar() {
  const { user } = useAuth();
  const { products, customers } = useStoreData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const productMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || (p.barcode ?? "").includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [products, query]);

  const customerMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [customers, query]);

  const hasResults = productMatches.length > 0 || customerMatches.length > 0;

  function goToInventory(seedQuery: string) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    navigate("/inventory", { state: { initialQuery: seedQuery } });
  }

  function goToCustomers(seedQuery: string) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    navigate("/customers", { state: { initialQuery: seedQuery } });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    // Prefer whichever list actually has a match for this query; default
    // to Inventory (the more common lookup) when neither does.
    if (productMatches.length > 0 || customerMatches.length === 0) {
      goToInventory(q);
    } else {
      goToCustomers(q);
    }
  }

  return (
    <div className="hidden items-center justify-between gap-4 lg:flex">
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search products or customers…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm focus:border-[var(--color-brand)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
        />
        {open && query.trim() !== "" && (
          <div className="card absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto p-1.5">
            {!hasResults && (
              <p className="px-3 py-4 text-center text-sm text-slate-400">No matches for "{query.trim()}".</p>
            )}
            {productMatches.length > 0 && (
              <div className="mb-1">
                <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Products
                </p>
                {productMatches.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goToInventory(product.name)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="truncate text-slate-700">{product.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{product.category}</span>
                  </button>
                ))}
              </div>
            )}
            {customerMatches.length > 0 && (
              <div>
                <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Customers
                </p>
                {customerMatches.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goToCustomers(customer.name)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="truncate text-slate-700">{customer.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{customer.phone ?? "No phone"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </form>

      <div className="flex shrink-0 items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand)]/10 text-sm font-bold text-[var(--color-brand)]">
          {user?.name?.charAt(0).toUpperCase() ?? "?"}
        </span>
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
          {user?.role && <p className="text-xs capitalize text-slate-400">{user.role}</p>}
        </div>
      </div>
    </div>
  );
}
