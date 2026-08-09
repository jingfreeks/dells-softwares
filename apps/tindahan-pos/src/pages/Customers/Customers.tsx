import { TEXT_SELECT_CUSTOMER_PROMPT } from "@/lib";
import { DebtAgeCard } from "@/components";
import {
  CustomersHeader,
  SummaryCards,
  CustomerFilters,
  CustomerTable,
  AddCustomerModal,
  CustomerBalanceCard,
  PaymentHistoryCard,
  RecentPaymentsCard,
} from "./component";
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
    duplicateCustomer,
    openAddForm,
    closeAddForm,
    selectCustomer,
    handleAddSubmit,
    handlePaymentSubmit,
    customers,
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
  } = useCustomersPage();

  return (
    <div className="tpl-root p-6">
      <CustomersHeader onAddCustomer={openAddForm} />

      <SummaryCards
        totalOutstanding={totalOutstanding}
        customerCount={customers.length}
        customersWithBalance={customers.filter((customer) => customer.balance > 0).length}
      />

      <CustomerFilters
        query={query}
        onQueryChange={setQuery}
        overdueOnly={overdueOnly}
        onToggleOverdueOnly={() => setOverdueOnly((v) => !v)}
        overdueCount={overdueCount}
        hasUtangOnly={hasUtangOnly}
        onToggleHasUtangOnly={() => setHasUtangOnly((v) => !v)}
        sortByOldestDebt={sortByOldestDebt}
        onToggleSortByOldestDebt={() => setSortByOldestDebt((v) => !v)}
      />

      <div className="tpl-dash-grid">
        <CustomerTable
          query={query}
          customers={filtered}
          oldestDebtDaysById={oldestDebtDaysById}
          thresholdDays={thresholdDays}
          selectedId={selectedId}
          onSelect={selectCustomer}
        />

        {selected ? (
          <div className="tpl-dash-col">
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
          <div
            className="tpl-card"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
          >
            <p className="tpl-ts">{TEXT_SELECT_CUSTOMER_PROMPT}</p>
          </div>
        )}
      </div>

      <div className="tpl-g2" style={{ marginTop: 14 }}>
        <DebtAgeCard aging={debtAging} thresholdDays={thresholdDays} />
        <RecentPaymentsCard />
      </div>

      {showAddForm && (
        <AddCustomerModal
          form={form}
          onFormChange={setForm}
          formError={formError}
          submitting={submitting}
          duplicateCustomer={duplicateCustomer}
          onOpenDuplicate={selectCustomer}
          onCancel={closeAddForm}
          onSubmit={handleAddSubmit}
        />
      )}
    </div>
  );
}
