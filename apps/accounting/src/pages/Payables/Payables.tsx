import { Link } from "react-router-dom";
import { AgingMeter, AppShell, LoadingSkeleton, StateScreen } from "@/components";
import { amount, formatDate, termsLabel } from "@/lib";
import { usePayables } from "./hooks";
import { daysLate, totalsFor } from "./lib";

export function Payables() {
  const { rows, loading, error, reload } = usePayables();

  if (loading) {
    return <AppShell title="Payables"><LoadingSkeleton label="Loading payables" /></AppShell>;
  }

  if (error) {
    return (
      <AppShell title="Payables">
        <StateScreen icon="ic-warn" heading="We couldn't load payables" tone="bad"
          action={<button type="button" className="btn" onClick={() => void reload()}>Try again</button>}>
          {error}
        </StateScreen>
      </AppShell>
    );
  }

  const t = totalsFor(rows);

  return (
    <AppShell title="Payables">
      <div className="pad">
        <div className="t-page">Payables</div>
        <div className="t-cap">What the shop owes suppliers for stock already delivered.</div>

        <div className="alert info" style={{ marginTop: 12 }}>
          <div>
            Deliveries and suppliers are recorded in <b>Inventory</b>. A delivery is owed until it
            is marked paid there — Accounting posts what that means and keeps no second list of
            suppliers.
          </div>
        </div>

        {rows.length === 0 ? (
          <StateScreen icon="ic-truck" heading="Nothing owed to suppliers">
            When stock is received and not yet marked paid, what you owe appears here.
          </StateScreen>
        ) : (
          <>
            <div className="row g12" style={{ marginTop: 14 }}>
              <div className="kpi lead">
                <div className="t-over">Total payable</div>
                <div className="amt amt-xxl">{amount(t.outstanding)}</div>
                <div className="t-cap">
                  {t.deliveries} deliver{t.deliveries === 1 ? "y" : "ies"} ·{" "}
                  {t.suppliers} supplier{t.suppliers === 1 ? "" : "s"}
                </div>
              </div>
              <div className="kpi">
                <div className="t-over">Overdue</div>
                <div className="amt amt-xl">{amount(t.overdue)}</div>
              </div>
              <div className="kpi">
                <div className="t-over">Not yet due</div>
                <div className="amt amt-xl">{amount(t.notYetDue)}</div>
              </div>
            </div>

            <div className="sechead" style={{ marginTop: 18 }}>How overdue it is</div>
            <AgingMeter buckets={t.buckets} total={t.outstanding} />

            <div className="sechead" style={{ marginTop: 22 }}>By supplier</div>
            <div className="tbl-w">
              <table className="tbl dense">
                <caption className="sr-only">Amounts owed by supplier</caption>
                <thead>
                  <tr>
                    <th scope="col">Supplier</th>
                    <th scope="col">Terms</th>
                    <th scope="col" className="num">Deliveries</th>
                    <th scope="col" className="num">Not yet due</th>
                    <th scope="col" className="num">Overdue</th>
                    <th scope="col">Oldest overdue</th>
                    <th scope="col" className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const overdue = p.d1_30 + p.d31_60 + p.d61_90 + p.d90Plus;
                    const late = daysLate(p.oldestDue);
                    return (
                      <tr key={p.supplierId ?? p.supplierName}>
                        <td>
                          {/* A delivery recorded before suppliers had records
                              of their own has no id to link to, so the name is
                              shown plainly rather than as a link that 404s. */}
                          {p.supplierId ? (
                            <Link to={`/payables/${p.supplierId}`}>{p.supplierName}</Link>
                          ) : (
                            p.supplierName
                          )}
                        </td>
                        <td><span className="mut">{termsLabel(p.paymentTerms)}</span></td>
                        <td className="num">{p.deliveries}</td>
                        <td className="num">{amount(p.notYetDue)}</td>
                        <td className="num">
                          {overdue > 0 ? amount(overdue) : <span className="dim">—</span>}
                        </td>
                        <td>
                          {p.oldestDue
                            ? `${formatDate(p.oldestDue)} · ${late} day${late === 1 ? "" : "s"} late`
                            : <span className="dim">—</span>}
                        </td>
                        <td className="num"><span className="amt">{amount(p.outstanding)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* The design puts a Record-payment form on the supplier screen.
                Saying so here, once, beats a disabled button on every row. */}
            <div className="alert warn" style={{ marginTop: 18 }}>
              <div>
                <b>Payments are recorded in Inventory, not here.</b> Tindahan POS marks a delivery
                paid in full or not at all, so there is no part-payment to record and no payment
                method to choose. Marking a delivery paid there posts the settlement here
                automatically.
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
