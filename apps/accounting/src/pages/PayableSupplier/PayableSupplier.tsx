import { useParams } from "react-router-dom";
import { AgingMeter, AppShell, LoadingSkeleton, StateScreen } from "@/components";
import { amount, formatDate, termsLabel } from "@/lib";
import { bucketsFor, daysLate } from "@/pages/Payables/lib";
import { usePayableSupplier } from "./hooks";

export function PayableSupplier() {
  const { id } = useParams<{ id: string }>();
  const { supplier, loading, error, settled, reload } = usePayableSupplier(id);

  if (loading) {
    return <AppShell title="Supplier"><LoadingSkeleton label="Loading the supplier" /></AppShell>;
  }

  if (error) {
    return (
      <AppShell title="Supplier">
        <StateScreen icon="ic-warn" heading="We couldn't load this supplier" tone="bad"
          action={<button type="button" className="btn" onClick={() => void reload()}>Try again</button>}>
          {error}
        </StateScreen>
      </AppShell>
    );
  }

  if (settled || !supplier) {
    return (
      <AppShell title="Supplier">
        <StateScreen icon="ic-tick" heading="Nothing owed">
          Every delivery from this supplier is marked paid. Their delivery history lives in
          Inventory.
        </StateScreen>
      </AppShell>
    );
  }

  const overdue = supplier.d1_30 + supplier.d31_60 + supplier.d61_90 + supplier.d90Plus;
  const late = daysLate(supplier.oldestDue);

  return (
    <AppShell title={supplier.supplierName}>
      <div className="pad">
        <div className="t-page">{supplier.supplierName}</div>
        <div className="t-cap">
          {termsLabel(supplier.paymentTerms)} · {supplier.deliveries} unpaid deliver
          {supplier.deliveries === 1 ? "y" : "ies"}
        </div>

        <div className="row g12" style={{ marginTop: 14 }}>
          <div className="kpi lead">
            <div className="t-over">Owed</div>
            <div className="amt amt-xxl">{amount(supplier.outstanding)}</div>
          </div>
          <div className="kpi">
            <div className="t-over">Overdue</div>
            <div className="amt amt-xl">{amount(overdue)}</div>
            <div className="t-cap">
              {supplier.oldestDue
                ? `Oldest due ${formatDate(supplier.oldestDue)} · ${late} day${late === 1 ? "" : "s"} late`
                : "Nothing overdue"}
            </div>
          </div>
          <div className="kpi">
            <div className="t-over">Not yet due</div>
            <div className="amt amt-xl">{amount(supplier.notYetDue)}</div>
          </div>
        </div>

        <div className="sechead" style={{ marginTop: 20 }}>How overdue this is</div>
        <AgingMeter buckets={bucketsFor(supplier)} total={supplier.outstanding} />

        {/* The design's inline Record-a-payment form is not here, and this
            says why rather than rendering a control that cannot work. */}
        <div className="alert warn" style={{ marginTop: 20 }}>
          <div>
            <b>To settle a delivery, mark it paid in Inventory.</b> Tindahan POS records a delivery
            as paid in full or not at all — there is no partial amount to enter and no payment
            method to choose, so a payment form here would be offering something the shop cannot
            actually do. The settlement posts to Accounts Payable automatically once the delivery
            is marked paid.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
