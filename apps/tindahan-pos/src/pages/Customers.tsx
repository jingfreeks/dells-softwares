import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useStoreData } from "../lib/storeData";
import { PESO } from "../lib/money";
import { selectOnFocus } from "../lib/dom";
import type { Customer, CreditPayment } from "../lib/types";

const emptyForm = { name: "", phone: "", creditLimit: "" };
const emptyPaymentForm = { amount: "0", note: "" };

export function Customers() {
  const { customers, addCustomer, recordCreditPayment, fetchCreditPayments } = useStoreData();
  const [query, setQuery] = useState("");
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
      setFormError("Name is required.");
      return;
    }
    const creditLimit = form.creditLimit.trim() === "" ? null : Number(form.creditLimit);
    if (creditLimit !== null && (Number.isNaN(creditLimit) || creditLimit < 0)) {
      setFormError("Credit limit must be a valid number.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const customer = await addCustomer(form.name, form.phone.trim() || null, creditLimit);
      setShowAddForm(false);
      selectCustomer(customer);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add customer.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaymentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      setPaymentError("Enter a payment amount greater than zero.");
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
      setPaymentError(err instanceof Error ? err.message : "Could not record payment.");
    } finally {
      setRecordingPayment(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Customers</h1>
      <p className="text-sm text-slate-500">Track utang (credit) balances and payments.</p>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total outstanding</p>
          <p className="tabular-nums mt-2 text-2xl font-semibold text-slate-900">
            {PESO.format(totalOutstanding)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Customers</p>
          <p className="tabular-nums mt-2 text-2xl font-semibold text-slate-900">{customers.length}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-4">
            <input
              type="text"
              placeholder="Search by name or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
            <button
              type="button"
              onClick={openAddForm}
              className="shrink-0 cursor-pointer rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
            >
              Add customer
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => selectCustomer(customer)}
                  className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                    selectedId === customer.id ? "bg-[var(--color-brand)]/5" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium text-slate-800">{customer.name}</p>
                    <p className="text-xs text-slate-500">{customer.phone ?? "No phone on file"}</p>
                  </div>
                  <span
                    className={`tabular-nums text-sm font-semibold ${
                      customer.balance > 0 ? "text-amber-600" : "text-slate-400"
                    }`}
                  >
                    {PESO.format(customer.balance)}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">
                {query ? `No customers match "${query}".` : "No customers yet."}
              </li>
            )}
          </ul>
        </div>

        {showAddForm ? (
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-slate-900">Add customer</h2>
            <form className="mt-4 flex flex-col gap-3" onSubmit={handleAddSubmit} noValidate>
              <div>
                <label htmlFor="custName" className="text-xs font-medium text-slate-700">
                  Name
                </label>
                <input
                  id="custName"
                  type="text"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>
              <div>
                <label htmlFor="custPhone" className="text-xs font-medium text-slate-700">
                  Phone (optional)
                </label>
                <input
                  id="custPhone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>
              <div>
                <label htmlFor="custLimit" className="text-xs font-medium text-slate-700">
                  Credit limit (₱, optional)
                </label>
                <input
                  id="custLimit"
                  type="number"
                  min="0"
                  placeholder="No limit"
                  value={form.creditLimit}
                  onFocus={selectOnFocus}
                  onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Shown as a reference at checkout — not enforced automatically.
                </p>
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
                {submitting ? "Adding…" : "Add customer"}
              </button>
            </form>
          </div>
        ) : selected ? (
          <div className="flex flex-col gap-4">
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-slate-900">{selected.name}</h2>
              <p className="text-xs text-slate-500">{selected.phone ?? "No phone on file"}</p>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs font-medium text-slate-500">Current balance</span>
                <span className="tabular-nums text-xl font-bold tracking-tight text-slate-900">
                  {PESO.format(selected.balance)}
                </span>
              </div>
              {selected.creditLimit !== null && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Credit limit: {PESO.format(selected.creditLimit)}
                </p>
              )}

              <form className="mt-4 flex flex-col gap-2" onSubmit={handlePaymentSubmit} noValidate>
                <label htmlFor="paymentAmount" className="text-xs font-medium text-slate-700">
                  Record a payment
                </label>
                <div className="flex gap-2">
                  <input
                    id="paymentAmount"
                    type="number"
                    min="0"
                    value={paymentForm.amount}
                    onFocus={selectOnFocus}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, note: e.target.value }))}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
                {paymentError && (
                  <p role="alert" className="text-sm text-red-600">
                    {paymentError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="mt-1 flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {recordingPayment ? "Recording…" : "Record payment"}
                </button>
              </form>
            </div>

            <div className="card">
              <div className="border-b border-slate-200 p-4">
                <h2 className="text-sm font-semibold text-slate-900">Payment history</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {paymentsLoading && (
                  <li className="px-4 py-8 text-center text-sm text-slate-400">Loading…</li>
                )}
                {!paymentsLoading &&
                  payments.map((payment) => (
                    <li key={payment.id} className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="tabular-nums font-medium text-slate-900">
                          {PESO.format(payment.amount)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(payment.timestamp).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {payment.note ? `${payment.note} · ` : ""}
                        recorded by {payment.createdByName}
                      </p>
                    </li>
                  ))}
                {!paymentsLoading && payments.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-slate-400">No payments recorded yet.</li>
                )}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            Select a customer to view their balance and record a payment.
          </div>
        )}
      </div>
    </div>
  );
}
