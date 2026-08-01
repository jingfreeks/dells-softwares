import { useEffect, useState, type FormEvent } from "react";
import {
  generateScanCodeQr,
  STORE_NAME,
  ERROR_NAME_REQUIRED,
  ERROR_COULD_NOT_SAVE_SUPPLIER,
  TEXT_SUPPLIER_PRINT_HINT,
  type Supplier,
} from "@/lib";

const emptyForm = { name: "", phone: "", address: "" };

export function useSuppliersPage(
  suppliers: Supplier[],
  addSupplier: (name: string, phone: string | null, address: string | null) => Promise<Supplier>,
  updateSupplier: (
    id: string,
    updates: { name: string; phone: string | null; address: string | null }
  ) => Promise<unknown>
) {
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
      setFormError(ERROR_NAME_REQUIRED);
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
      setFormError(err instanceof Error ? err.message : ERROR_COULD_NOT_SAVE_SUPPLIER);
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
    hint.textContent = TEXT_SUPPLIER_PRINT_HINT;

    doc.body.append(heading, name, img, hint);

    win.focus();
    win.print();
  }

  return {
    showForm,
    editingId,
    form,
    setForm,
    formError,
    submitting,
    selectedId,
    qrDataUrl,
    selected,
    openAddForm,
    openEditForm,
    selectSupplier,
    handleSubmit,
    handlePrint,
  };
}
