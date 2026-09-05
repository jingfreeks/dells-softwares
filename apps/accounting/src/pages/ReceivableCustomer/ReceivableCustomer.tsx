import { useParams } from "react-router-dom";
import { AgingMeter, AppShell, LoadingSkeleton, StateScreen } from "@/components";
import { amount, formatDate } from "@/lib";

import { bucketsFor, daysOverdue } from "@/pages/Receivables/lib";
import { useReceivableCustomer } from "./hooks";

export function ReceivableCustomer() {
  const { id } = useParams<{ id: string }>();
  const { customer, loading, error, settled, reload } = useReceivableCustomer(id);

  if (loading) {
    return <AppShell title="Customer"><LoadingSkeleton label="Loading the customer" /></AppShell>;
  }

  if (error) {
    return (
      <AppShell title="Customer">
        <StateScreen icon="ic-warn" heading="We couldn't load this customer" tone="bad"
          action={<button type="button" className="btn" onClick={() => void reload()}>Try again</button>}>
          {error}
        </StateScreen>
      </AppShell>
    );
  }

  if (settled || !customer) {
    return (
      <AppShell title="Customer">
        <StateScreen icon="ic-tick" heading="Nothing outstanding">
          This customer owes nothing, so they are not on the receivables list. Their purchase and
          payment history lives in Tindahan POS.
        </StateScreen>
      </AppShell>
    );
  }

  const days = daysOverdue(customer.oldestUnpaid);
  const overdue = customer.d1_30 + customer.d31_60 + customer.d61_90 + customer.d90Plus;

  return (
    <AppShell title={customer.customerName}>
      <div className="pad">
        <div className="t-page">{customer.customerName}</div>
        <div className="t-cap">
          Utang owed to the shop. Managed in Tindahan POS — Accounting shows what it means.
        </div>

        <div className="row g12" style={{ marginTop: 14 }}>
          <div className="kpi lead">
            <div className="t-over">Outstanding</div>
            <div className="amt amt-xxl">{amount(customer.outstanding)}</div>
          </div>
          <div className="kpi">
            <div className="t-over">Overdue</div>
            <div className="amt amt-xl">{amount(overdue)}</div>
            <div className="t-cap">
              {customer.oldestUnpaid
                ? `Oldest charge ${formatDate(customer.oldestUnpaid)} · ${days} day${days === 1 ? "" : "s"}`
                : "Nothing aged"}
            </div>
          </div>
          <div className="kpi">
            <div className="t-over">Last payment</div>
            <div className="amt amt-lg">
              {customer.lastPaymentAt ? formatDate(customer.lastPaymentAt.slice(0, 10)) : "Never"}
            </div>
          </div>
        </div>

        {customer.unaged > 0 ? (
          <div className="alert warn" style={{ marginTop: 14 }}>
            <div>
              <b>{amount(customer.unaged)} of this balance has no charge behind it</b> — an opening
              balance or a correction. It is counted in the total and left out of the buckets,
              because Tindahan POS records payments without naming the charge they settle.
            </div>
          </div>
        ) : null}

        <div className="sechead" style={{ marginTop: 20 }}>How old this balance is</div>
        <AgingMeter buckets={bucketsFor(customer)} total={customer.outstanding} />

        {/* Deliberately not a transaction table. The design shows charges and
            payments with a running balance; producing that needs a per-customer
            reader the database does not have yet, and inventing one here from
            the ledger would show only what accounting has posted rather than
            what the customer actually did. Saying where the history lives beats
            showing half of it. */}
        <div className="alert info" style={{ marginTop: 20 }}>
          <div>
            Individual purchases and payments are recorded in <b>Tindahan POS</b>, under this
            customer's utang. Accounting posts the totals to Accounts Receivable rather than
            keeping a second history of them.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
