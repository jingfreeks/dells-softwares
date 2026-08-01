import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import {
  useStoreData,
  ERROR_NAME_REQUIRED,
  ERROR_CREDIT_LIMIT_INVALID,
  ERROR_COULD_NOT_ADD_CUSTOMER,
  ERROR_PAYMENT_AMOUNT_INVALID,
  ERROR_COULD_NOT_RECORD_PAYMENT,
  type Customer,
  type CreditPayment,
} from "@/lib";

const emptyForm = { name: "", phone: "", creditLimit: "" };
const emptyPaymentForm = { amount: "0", note: "" };

export function useCustomersPage() {
  const { customers, addCustomer, recordCreditPayment, fetchCreditPayments } = useStoreData();
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...customers].sort((a, b) => b.balance - a.balance);
    if (!q) return sorted;
    return sorted.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

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

    setSubmitting(true);
    setFormError(null);
    try {
      const customer = await addCustomer(form.name, form.phone.trim() || null, creditLimit);
      setShowAddForm(false);
      selectCustomer(customer);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : ERROR_COULD_NOT_ADD_CUSTOMER);
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
      setPaymentError(err instanceof Error ? err.message : ERROR_COULD_NOT_RECORD_PAYMENT);
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
    openAddForm,
    selectCustomer,
    handleAddSubmit,
    handlePaymentSubmit,
  };
}
