import { NAV_LABEL_CUSTOMERS, TEXT_CUSTOMERS_DESCRIPTION, TEXT_SELECT_CUSTOMER_PROMPT } from "@/lib";
import { SummaryCards, CustomerListCard, AddCustomerForm, CustomerBalanceCard, PaymentHistoryCard } from "./component";
import { useCustomersPage } from "./hooks";

export function Customers() {
  const {
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
    customers,
  } = useCustomersPage();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">{NAV_LABEL_CUSTOMERS}</h1>
      <p className="text-sm text-slate-500">{TEXT_CUSTOMERS_DESCRIPTION}</p>

      <SummaryCards totalOutstanding={totalOutstanding} customerCount={customers.length} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <CustomerListCard
          query={query}
          onQueryChange={setQuery}
          onAdd={openAddForm}
          filtered={filtered}
          selectedId={selectedId}
          onSelect={selectCustomer}
        />

        {showAddForm ? (
          <AddCustomerForm form={form} onFormChange={setForm} formError={formError} submitting={submitting} onSubmit={handleAddSubmit} />
        ) : selected ? (
          <div className="flex flex-col gap-4">
            <CustomerBalanceCard
              customer={selected}
              paymentForm={paymentForm}
              onPaymentFormChange={setPaymentForm}
              paymentError={paymentError}
              recordingPayment={recordingPayment}
              onSubmit={handlePaymentSubmit}
            />
            <PaymentHistoryCard payments={payments} loading={paymentsLoading} />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            {TEXT_SELECT_CUSTOMER_PROMPT}
          </div>
        )}
      </div>
    </div>
  );
}
