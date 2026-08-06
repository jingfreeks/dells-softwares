import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, useStoreData, generateScanCodeQr, STORE_NAME, type Supplier } from "@/lib";
import { QrCodeIcon, PrintIcon } from "@/components";

const emptyForm = { name: "", phone: "", address: "" };

export function Suppliers() {
  const { user } = useAuth();
  const { suppliers, addSupplier, updateSupplier } = useStoreData();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const selected = suppliers.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    generateScanCodeQr(selected.scanCode).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  if (user && user.role !== "admin") {
    return <Navigate to="/pos" replace />;
  }

  function openAddForm() {
    setSelectedId(null);
    setEditingId(null);
    setShowForm(true);
    setForm(emptyForm);
    setFormError(null);
  }

  function openEditForm(supplier: Supplier) {
    setSelectedId(null);
    setEditingId(supplier.id);
    setShowForm(true);
    setForm({ name: supplier.name, phone: supplier.phone ?? "", address: supplier.address ?? "" });
    setFormError(null);
  }

  function selectSupplier(supplier: Supplier) {
    setShowForm(false);
    setSelectedId(supplier.id);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateSupplier(editingId, {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        });
        setShowForm(false);
        setSelectedId(editingId);
      } else {
        const supplier = await addSupplier(form.name, form.phone.trim() || null, form.address.trim() || null);
        setShowForm(false);
        selectSupplier(supplier);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save supplier.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrint() {
    // window.open() must happen synchronously in the click handler — by
    // the time the QR data URL is ready (already generated here, but the
    // pattern matters generally) the browser may no longer treat this as
    // a direct response to the click. See reportPdf.ts's printPdfDoc for
    // the full story on why this burned us before.
    const win = window.open("", "_blank");
    if (!win || !selected || !qrDataUrl) return;

    // Built via DOM APIs rather than a document.write() template string —
    // selected.name is store-entered data, and interpolating it straight
    // into HTML would let a supplier name like `<img onerror=...>` run
    // script in a window that's same-origin with the app (and so able to
    // read the Supabase session out of localStorage). textContent never
    // parses its input as markup, so this is safe regardless of what a
    // supplier is named.
    const doc = win.document;
    doc.title = `${selected.name} — Supplier code`;
    doc.body.style.cssText = "font-family: sans-serif; text-align: center; padding: 40px;";

    const heading = doc.createElement("h2");
    heading.textContent = STORE_NAME;

    const name = doc.createElement("p");
    name.style.cssText = "font-size: 18px; font-weight: 600;";
    name.textContent = selected.name;

    const img = doc.createElement("img");
    img.src = qrDataUrl;
    img.width = 240;
    img.height = 240;
    img.style.margin = "24px 0";
    img.alt = `Scan code for ${selected.name}`;

    const hint = doc.createElement("p");
    hint.style.cssText = "color: #64748b; font-size: 13px;";
    hint.textContent = "Scan this at Receiving to select this supplier.";

    doc.body.append(heading, name, img, hint);

    win.focus();
    win.print();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Suppliers</h1>
      <p className="text-sm text-slate-500">
        Manage suppliers and print a scannable code for quick selection during receiving.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Suppliers</h2>
            <button
              type="button"
              onClick={openAddForm}
              className="cursor-pointer rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
            >
              Add supplier
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {suppliers.map((supplier) => (
              <li key={supplier.id}>
                <button
                  type="button"
                  onClick={() => selectSupplier(supplier)}
                  className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                    selectedId === supplier.id ? "bg-[var(--color-brand)]/5" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium text-slate-800">{supplier.name}</p>
                    <p className="text-xs text-slate-500">{supplier.phone ?? "No phone on file"}</p>
                  </div>
                  <QrCodeIcon className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              </li>
            ))}
            {suppliers.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">No suppliers yet.</li>
            )}
          </ul>
        </div>

        {showForm ? (
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {editingId ? "Edit supplier" : "Add supplier"}
            </h2>
            <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="supName" className="text-xs font-medium text-slate-700">
                  Name
                </label>
                <input
                  id="supName"
                  type="text"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>
              <div>
                <label htmlFor="supPhone" className="text-xs font-medium text-slate-700">
                  Phone (optional)
                </label>
                <input
                  id="supPhone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>
              <div>
                <label htmlFor="supAddress" className="text-xs font-medium text-slate-700">
                  Address (optional)
                </label>
                <input
                  id="supAddress"
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              {formError && (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving…" : editingId ? "Save changes" : "Add supplier"}
              </button>
            </form>
          </div>
        ) : selected ? (
          <div className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{selected.name}</h2>
                <p className="text-xs text-slate-500">{selected.phone ?? "No phone on file"}</p>
                {selected.address && <p className="text-xs text-slate-500">{selected.address}</p>}
              </div>
              <button
                type="button"
                onClick={() => openEditForm(selected)}
                className="cursor-pointer text-xs font-medium text-[var(--color-brand)] hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center rounded-xl bg-slate-50 p-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`Scan code for ${selected.name}`} className="h-40 w-40" />
              ) : (
                <div className="h-40 w-40 animate-pulse rounded bg-slate-200" />
              )}
              <p className="mt-3 text-center text-xs text-slate-500">
                Print and keep on hand — scan it at Receiving to select {selected.name} instantly.
              </p>
              <button
                type="button"
                onClick={handlePrint}
                disabled={!qrDataUrl}
                className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PrintIcon className="h-4 w-4" />
                Print code
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            Select a supplier to view and print their scan code.
          </div>
        )}
      </div>
    </div>
  );
}
