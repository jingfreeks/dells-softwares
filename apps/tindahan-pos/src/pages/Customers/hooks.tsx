import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import {
  useAuth,
  useStoreData,
  ERROR_NAME_REQUIRED,
  ERROR_CREDIT_LIMIT_INVALID,
  ERROR_COULD_NOT_ADD_CUSTOMER,
  ERROR_OPENING_BALANCE_INVALID,
  ERROR_PAYMENT_AMOUNT_INVALID,
  ERROR_COULD_NOT_RECORD_PAYMENT,
  buildDebtAgingSummary,
  computeOldestDebtDays,
  isOverdueDebt,
  type Customer,
  type CreditPayment, describePlatformError } from "@/lib";
import { findDuplicateCustomer } from "./lib";

export type PaymentSchedule = "biweekly" | "weekly" | "none";

const emptyForm = {
  name: "",
  nickname: "",
  phone: "",
  creditLimit: "",
  blockCreditPastLimit: false,
  paymentSchedule: "biweekly" as PaymentSchedule,
  openingBalance: "",
};
const emptyPaymentForm = { amount: "0", note: "" };

export function useCustomersPage() {
  const { customers, sales, addCustomer, recordCreditPayment, fetchCreditPayments } = useStoreData();
  const { store } = useAuth();
  // The store's own setting, not a per-device copy. This used to read
  // localStorage, which is how this page and Review came to age the same
  // customers by different rules -- see 20260905100000.
  const thresholdDays = store?.utangOverdueDays ?? 30;
  const location = useLocation();
  const [query, setQuery] = useState(
    () => (location.state as { initialQuery?: string } | null)?.initialQuery ?? ""
  );

  // The topbar's quick search navigates here with a query in
  // location.state rather than a URL param, so a second search from the
  // dashboard while already on this page (same route, new state) needs
  // its own effect — the useState initializer above only runs once, on
  // mount.
  useEffect(() => {
    const initialQuery = (location.state as { initialQuery?: string } | null)?.initialQuery;
    if (initialQuery) setQuery(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);

  const duplicateCustomer = useMemo(
    () => (showAddForm ? findDuplicateCustomer(customers, form.name) : null),
    [showAddForm, customers, form.name]
  );

  const [overdueOnly, setOverdueOnly] = useState(false);
  const [hasUtangOnly, setHasUtangOnly] = useState(false);
  const [sortByOldestDebt, setSortByOldestDebt] = useState(false);

  const oldestDebtDaysById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const customer of customers) {
      map.set(customer.id, computeOldestDebtDays(sales, customer));
    }
    return map;
  }, [customers, sales]);

  const overdueCount = useMemo(
    () => customers.filter((c) => isOverdueDebt(oldestDebtDaysById.get(c.id) ?? null, thresholdDays)).length,
    [customers, oldestDebtDaysById, thresholdDays]
  );

  const debtAging = useMemo(
    () => buildDebtAgingSummary(customers, oldestDebtDaysById, thresholdDays),
    [customers, oldestDebtDaysById, thresholdDays]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = [...customers];
    if (q) {
      rows = rows.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q)
      );
    }
    if (overdueOnly) {
      rows = rows.filter((c) => isOverdueDebt(oldestDebtDaysById.get(c.id) ?? null, thresholdDays));
    }
    if (hasUtangOnly) {
      rows = rows.filter((c) => c.balance > 0);
    }
    if (sortByOldestDebt) {
      rows.sort((a, b) => (oldestDebtDaysById.get(b.id) ?? -1) - (oldestDebtDaysById.get(a.id) ?? -1));
    } else {
      rows.sort((a, b) => b.balance - a.balance);
    }
    return rows;
  }, [customers, query, overdueOnly, hasUtangOnly, sortByOldestDebt, oldestDebtDaysById, thresholdDays]);

  const totalOutstanding = useMemo(
    () => customers.reduce((sum, c) => sum + c.balance, 0),
    [customers]
  );

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) {
      setPayments([]);
      return;
    }
    let cancelled = false;
    setPaymentsLoading(true);
    fetchCreditPayments(selectedId)
      .then((rows) => {
        if (!cancelled) setPayments(rows);
      })
      .finally(() => {
        if (!cancelled) setPaymentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, fetchCreditPayments]);

  function openAddForm() {
    setSelectedId(null);
    setShowAddForm(true);
    setForm(emptyForm);
    setFormError(null);
  }

  function closeAddForm() {
    setShowAddForm(false);
    setFormError(null);
  }

  function selectCustomer(customer: Customer) {
    setShowAddForm(false);
    setSelectedId(customer.id);
    setPaymentForm(emptyPaymentForm);
    setPaymentError(null);
  }

  async function handleAddSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError(ERROR_NAME_REQUIRED);
      return;
    }
    const creditLimit = form.creditLimit.trim() === "" ? null : Number(form.creditLimit);
    if (creditLimit !== null && (Number.isNaN(creditLimit) || creditLimit < 0)) {
      setFormError(ERROR_CREDIT_LIMIT_INVALID);
      return;
    }
    const openingBalance = form.openingBalance.trim() === "" ? 0 : Number(form.openingBalance);
    if (Number.isNaN(openingBalance) || openingBalance < 0) {
      setFormError(ERROR_OPENING_BALANCE_INVALID);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      // TODO: nickname, blockCreditPastLimit, paymentSchedule, and
      // openingBalance have no backend column/RPC yet (customers only
      // has name/phone/credit_limit/balance, and balance is a running
      // total with no "set initial value" path) — validated here and
      // held in form state, but not persisted until the backend adds
      // support.
      const customer = await addCustomer(form.name, form.phone.trim() || null, creditLimit);
      setShowAddForm(false);
      selectCustomer(customer);
    } catch (err) {
      setFormError(describePlatformError(err, ERROR_COULD_NOT_ADD_CUSTOMER));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaymentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      setPaymentError(ERROR_PAYMENT_AMOUNT_INVALID);
      return;
    }

    setRecordingPayment(true);
    setPaymentError(null);
    try {
      await recordCreditPayment(selected.id, amount, paymentForm.note.trim() || undefined);
      setPaymentForm(emptyPaymentForm);
      const rows = await fetchCreditPayments(selected.id);
      setPayments(rows);
    } catch (err) {
      setPaymentError(describePlatformError(err, ERROR_COULD_NOT_RECORD_PAYMENT));
    } finally {
      setRecordingPayment(false);
    }
  }

  return {
    customers,
    query,
    setQuery,
    showAddForm,
    form,
    setForm,
    formError,
    submitting,
    selectedId,
    payments,
    paymentsLoading,
    paymentForm,
    setPaymentForm,
    paymentError,
    recordingPayment,
    filtered,
    totalOutstanding,
    selected,
    duplicateCustomer,
    openAddForm,
    closeAddForm,
    selectCustomer,
    handleAddSubmit,
    handlePaymentSubmit,
    overdueOnly,
    setOverdueOnly,
    hasUtangOnly,
    setHasUtangOnly,
    sortByOldestDebt,
    setSortByOldestDebt,
    overdueCount,
    oldestDebtDaysById,
    debtAging,
    thresholdDays,
  };
}
