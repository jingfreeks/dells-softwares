import { describePlatformError } from "@/lib/platformErrors";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  useStoreData,
  generateScanCodeQr,
  isoWeekday,
  nextExpectedDelivery,
  supplierSpend,
  supplierDueDate,
  supplierUnpaidTotal,
  deliveryCount,
  lastDeliveryDate,
  costChangesWorthKnowing,
  findSimilarSupplierName,
  STORE_NAME,
  ERROR_NAME_REQUIRED,
  ERROR_COULD_NOT_SAVE_SUPPLIER,
  ERROR_COULD_NOT_MARK_PAID,
  ERROR_COULD_NOT_DEACTIVATE_SUPPLIER,
  TEXT_SUPPLIER_PRINT_HINT,
  type Supplier,
  type SupplierPaymentTerms,
} from "@/lib";

export interface SupplierFormValues {
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  categoryIds: string[];
  usualDeliveryDays: number[];
  paymentTerms: SupplierPaymentTerms;
}

const emptyForm: SupplierFormValues = {
  name: "",
  contactPerson: "",
  phone: "",
  address: "",
  categoryIds: [],
  usualDeliveryDays: [],
  paymentTerms: "cash",
};

export type SupplierSort = "most_spent" | "recently_delivered" | "name";

function monthStart(from = new Date()): string {
  return new Date(from.getFullYear(), from.getMonth(), 1).toISOString().slice(0, 10);
}

function daysUntilWeekday(weekday: number, today = new Date()): number {
  const todayIso = isoWeekday(today);
  return (weekday - todayIso + 7) % 7;
}

export function useSuppliersPage() {
  const {
    suppliers,
    categories,
    products,
    addSupplier,
    updateSupplier,
    deactivateSupplier,
    markSupplierPaid,
    fetchReceivingHistoryInRange,
  } = useStoreData();

  const [monthHistory, setMonthHistory] = useState<Awaited<ReturnType<typeof fetchReceivingHistoryInRange>>>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    fetchReceivingHistoryInRange({ startDate: monthStart(), endDate: new Date().toISOString().slice(0, 10) })
      .then((rows) => {
        if (!cancelled) setMonthHistory(rows);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on mount; suppliers/receiving mutations already refresh via useStoreData and don't need a re-derive here
  }, []);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormValues>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateSupplier, setDuplicateSupplier] = useState<Supplier | null>(null);

  // Search/filter/sort state
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [owingOnly, setOwingOnly] = useState(false);
  const [sort, setSort] = useState<SupplierSort>("most_spent");

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setDuplicateSupplier(null);
    setShowModal(true);
  }

  function openEditForm(supplier: Supplier) {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      categoryIds: supplier.categoryIds,
      usualDeliveryDays: supplier.usualDeliveryDays,
      paymentTerms: supplier.paymentTerms,
    });
    setFormError(null);
    setDuplicateSupplier(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  function onNameChange(name: string) {
    setForm((f) => ({ ...f, name }));
    if (!editingId && name.trim()) {
      setDuplicateSupplier(findSimilarSupplierName(suppliers, name));
    } else {
      setDuplicateSupplier(null);
    }
  }

  async function handleSubmit(e: FormEvent, addAnother = false) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError(ERROR_NAME_REQUIRED);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        paymentTerms: form.paymentTerms,
        categoryIds: form.categoryIds,
        usualDeliveryDays: form.usualDeliveryDays,
      };
      if (editingId) {
        await updateSupplier(editingId, payload);
      } else {
        await addSupplier(payload);
      }
      if (addAnother && !editingId) {
        setForm(emptyForm);
        setDuplicateSupplier(null);
      } else {
        setShowModal(false);
      }
    } catch (err) {
      setFormError(describePlatformError(err, ERROR_COULD_NOT_SAVE_SUPPLIER));
    } finally {
      setSubmitting(false);
    }
  }

  const [actionError, setActionError] = useState<string | null>(null);

  async function handleMarkPaid(supplierId: string) {
    setActionError(null);
    try {
      await markSupplierPaid(supplierId);
      const updated = await fetchReceivingHistoryInRange({
        startDate: monthStart(),
        endDate: new Date().toISOString().slice(0, 10),
      });
      setMonthHistory(updated);
    } catch (err) {
      setActionError(describePlatformError(err, ERROR_COULD_NOT_MARK_PAID));
    }
  }

  async function handleDeactivate(supplierId: string) {
    setActionError(null);
    try {
      await deactivateSupplier(supplierId);
    } catch (err) {
      setActionError(describePlatformError(err, ERROR_COULD_NOT_DEACTIVATE_SUPPLIER));
    }
  }

  // Derived per-supplier metrics, computed once per render over the
  // fetched month history rather than re-querying per row.
  const supplierStats = useMemo(() => {
    const since = monthStart();
    const map = new Map<
      string,
      { spend30d: number; spendMonth: number; deliveries: number; lastDelivery: string | null; unpaid: number }
    >();
    for (const supplier of suppliers) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      map.set(supplier.id, {
        spend30d: supplierSpend(monthHistory, supplier.id, thirtyDaysAgo.toISOString().slice(0, 10)),
        spendMonth: supplierSpend(monthHistory, supplier.id, since),
        deliveries: deliveryCount(monthHistory, supplier.id, since),
        lastDelivery: lastDeliveryDate(monthHistory, supplier.id),
        unpaid: supplierUnpaidTotal(monthHistory, supplier.id),
      });
    }
    return map;
  }, [suppliers, monthHistory]);

  const spentThisMonth = useMemo(
    () => Array.from(supplierStats.values()).reduce((sum, s) => sum + s.spendMonth, 0),
    [supplierStats]
  );
  const deliveriesThisMonth = useMemo(
    () => Array.from(supplierStats.values()).reduce((sum, s) => sum + s.deliveries, 0),
    [supplierStats]
  );
  const unpaidTotal = useMemo(
    () => Array.from(supplierStats.values()).reduce((sum, s) => sum + s.unpaid, 0),
    [supplierStats]
  );
  const mostOverdueSupplier = useMemo(() => {
    const owing = suppliers.filter((s) => (supplierStats.get(s.id)?.unpaid ?? 0) > 0);
    return owing.length > 0 ? owing[0] : null;
  }, [suppliers, supplierStats]);
  const mostOverdueDueDate = useMemo(() => {
    if (!mostOverdueSupplier) return null;
    const unpaidEntries = monthHistory.filter((e) => e.supplierId === mostOverdueSupplier.id && !e.paid);
    if (unpaidEntries.length === 0) return null;
    const oldest = unpaidEntries.reduce((earliest, e) => (e.date < earliest.date ? e : earliest));
    return supplierDueDate(oldest.date, mostOverdueSupplier.paymentTerms);
  }, [mostOverdueSupplier, monthHistory]);
  const nextExpectedSupplier = useMemo(() => {
    let best: { supplier: Supplier; weekday: number; offset: number } | null = null;
    for (const supplier of suppliers) {
      const weekday = nextExpectedDelivery(supplier.usualDeliveryDays);
      if (weekday === null) continue;
      const offset = daysUntilWeekday(weekday);
      if (!best || offset < best.offset) best = { supplier, weekday, offset };
    }
    return best;
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = suppliers.filter((s) => {
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson ?? "").toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "All" || s.categoryIds.includes(categoryFilter);
      const matchesOwing = !owingOnly || (supplierStats.get(s.id)?.unpaid ?? 0) > 0;
      return matchesQuery && matchesCategory && matchesOwing;
    });
    rows = [...rows].sort((a, b) => {
      if (sort === "most_spent") return (supplierStats.get(b.id)?.spend30d ?? 0) - (supplierStats.get(a.id)?.spend30d ?? 0);
      if (sort === "recently_delivered") {
        const aDate = supplierStats.get(a.id)?.lastDelivery ?? "";
        const bDate = supplierStats.get(b.id)?.lastDelivery ?? "";
        return bDate.localeCompare(aDate);
      }
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [suppliers, query, categoryFilter, owingOnly, sort, supplierStats]);

  const costChanges = useMemo(
    () => costChangesWorthKnowing(monthHistory, products, suppliers),
    [monthHistory, products, suppliers]
  );

  function handlePrintScanSheet() {
    const activeSuppliers = suppliers;
    const win = window.open("", "_blank");
    if (!win || activeSuppliers.length === 0) return;

    const doc = win.document;
    doc.title = `${STORE_NAME} — Supplier scan sheet`;
    doc.body.style.cssText = "font-family: sans-serif; padding: 24px;";

    const heading = doc.createElement("h1");
    heading.style.cssText = "font-size: 18px; margin-bottom: 16px;";
    heading.textContent = `${STORE_NAME} — Supplier scan sheet`;
    doc.body.append(heading);

    Promise.all(activeSuppliers.map((s) => generateScanCodeQr(s.scanCode))).then((qrUrls) => {
      const grid = doc.createElement("div");
      grid.style.cssText = "display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;";
      activeSuppliers.forEach((supplier, i) => {
        const cell = doc.createElement("div");
        cell.style.cssText = "text-align: center; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; break-inside: avoid;";

        const name = doc.createElement("p");
        name.style.cssText = "font-size: 16px; font-weight: 600; margin-bottom: 8px;";
        name.textContent = supplier.name;

        const img = doc.createElement("img");
        img.src = qrUrls[i];
        img.width = 180;
        img.height = 180;
        img.alt = `Scan code for ${supplier.name}`;

        const hint = doc.createElement("p");
        hint.style.cssText = "color: #64748b; font-size: 12px; margin-top: 8px;";
        hint.textContent = TEXT_SUPPLIER_PRINT_HINT;

        cell.append(name, img, hint);
        grid.append(cell);
      });
      doc.body.append(grid);
      win.focus();
      win.print();
    });
  }

  async function handlePrintSupplierCode(supplier: Supplier) {
    const qrDataUrl = await generateScanCodeQr(supplier.scanCode);
    const win = window.open("", "_blank");
    if (!win) return;
    const doc = win.document;
    doc.title = `${supplier.name} — Supplier code`;
    doc.body.style.cssText = "font-family: sans-serif; text-align: center; padding: 40px;";

    const heading = doc.createElement("h2");
    heading.textContent = STORE_NAME;
    const name = doc.createElement("p");
    name.style.cssText = "font-size: 18px; font-weight: 600;";
    name.textContent = supplier.name;
    const img = doc.createElement("img");
    img.src = qrDataUrl;
    img.width = 240;
    img.height = 240;
    img.style.margin = "24px 0";
    img.alt = `Scan code for ${supplier.name}`;
    const hint = doc.createElement("p");
    hint.style.cssText = "color: #64748b; font-size: 13px;";
    hint.textContent = TEXT_SUPPLIER_PRINT_HINT;

    doc.body.append(heading, name, img, hint);
    win.focus();
    win.print();
  }

  return {
    suppliers,
    categories,
    historyLoading,
    showModal,
    editingId,
    form,
    setForm,
    onNameChange,
    formError,
    submitting,
    duplicateSupplier,
    openAddForm,
    openEditForm,
    closeModal,
    handleSubmit,
    query,
    setQuery,
    categoryFilter,
    setCategoryFilter,
    owingOnly,
    setOwingOnly,
    sort,
    setSort,
    filteredSuppliers,
    supplierStats,
    spentThisMonth,
    deliveriesThisMonth,
    unpaidTotal,
    mostOverdueSupplier,
    mostOverdueDueDate,
    nextExpectedSupplier,
    costChanges,
    actionError,
    handleMarkPaid,
    handleDeactivate,
    handlePrintScanSheet,
    handlePrintSupplierCode,
  };
}
