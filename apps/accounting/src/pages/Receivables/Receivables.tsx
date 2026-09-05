import { Link } from "react-router-dom";
import { AppShell, LoadingSkeleton, StateScreen } from "@/components";
import { amount, formatDate } from "@/lib";
import { AgingMeter } from "./component";
import { useReceivables } from "./hooks";
import { daysOverdue, totalsFor } from "./lib";

export function Receivables() {
  const { rows, loading, error, reload } = useReceivables();

  if (loading) {
    return <AppShell title="Receivables"><LoadingSkeleton label="Loading receivables" /></AppShell>;
  }

  if (error) {
    return (
      <AppShell title="Receivables">
        <StateScreen icon="ic-warn" heading="We couldn't load receivables" tone="bad"
          action={<button type="button" className="btn" onClick={() => void reload()}>Try again</button>}>
          {error}
        </StateScreen>
      </AppShell>
    );
  }

  const t = totalsFor(rows);

  return (
    <AppShell title="Receivables">
      <div className="pad">
        <div className="t-page">Receivables</div>
        <div className="t-cap">What customers owe the shop, and how long they have owed it.</div>

        {/* The design's §6 integration note: no second customer system is
            created here, and the screen says where customers are managed. */}
        <div className="alert info" style={{ marginTop: 12 }}>
          <div>
            These balances mirror the <b>utang ledger in Tindahan POS</b>. Customers, credit limits
            and payments are managed there — Accounting records what the balances mean, and does
            not keep a second list of customers.
          </div>
        </div>

        {rows.length === 0 ? (
          <StateScreen icon="ic-users" heading="Nobody owes anything">
            When a customer buys on utang in Tindahan POS, their balance appears here.
          </StateScreen>
        ) : (
          <>
            <div className="row g12" style={{ marginTop: 14 }}>
              <div className="kpi lead">
                <div className="t-over">Total outstanding</div>
                <div className="amt amt-xxl">{amount(t.outstanding)}</div>
                <div className="t-cap">{t.customers} customer{t.customers === 1 ? "" : "s"}</div>
              </div>
              <div className="kpi">
                <div className="t-over">Overdue</div>
                <div className="amt amt-xl">{amount(t.overdue)}</div>
              </div>
              <div className="kpi">
                <div className="t-over">Current</div>
                <div className="amt amt-xl">{amount(t.current)}</div>
              </div>
            </div>

            {/* Only shown when there is any, because explaining a concept that
                does not apply to this shop is noise. */}
            {t.unaged > 0 ? (
              <div className="alert warn" style={{ marginTop: 12 }}>
                <div>
                  <b>{amount(t.unaged)} could not be aged.</b> Tindahan POS records utang payments
                  without naming the charge they settle, so a balance with no sale behind it — an
                  opening balance, or a manual correction — has no date to age from. It is counted
                  in the total and left out of the buckets rather than guessed at.
                </div>
              </div>
            ) : null}

            <div className="sechead" style={{ marginTop: 18 }}>How old the utang is</div>
            <AgingMeter buckets={t.buckets} total={t.outstanding} />

            <div className="sechead" style={{ marginTop: 22 }}>By customer</div>
            <div className="tbl-w">
              <table className="tbl dense">
                <caption className="sr-only">Outstanding utang by customer</caption>
                <thead>
                  <tr>
                    <th scope="col">Customer</th>
                    <th scope="col" className="num">Outstanding</th>
                    <th scope="col" className="num">Current</th>
                    <th scope="col" className="num">Overdue</th>
                    <th scope="col">Oldest charge</th>
                    <th scope="col">Last payment</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const overdue = r.d1_30 + r.d31_60 + r.d61_90 + r.d90Plus;
                    const days = daysOverdue(r.oldestUnpaid);
                    return (
                      <tr key={r.customerId}>
                        <td>
                          <Link to={`/receivables/${r.customerId}`}>{r.customerName}</Link>
                        </td>
                        <td className="num"><span className="amt">{amount(r.outstanding)}</span></td>
                        <td className="num">{amount(r.current)}</td>
                        <td className="num">
                          {/* Words, not colour alone -- the day count says how bad it is. */}
                          {overdue > 0 ? amount(overdue) : <span className="dim">—</span>}
                        </td>
                        <td>
                          {r.oldestUnpaid
                            ? `${formatDate(r.oldestUnpaid)} · ${days} day${days === 1 ? "" : "s"}`
                            : <span className="dim">—</span>}
                        </td>
                        <td>
                          {r.lastPaymentAt
                            ? formatDate(r.lastPaymentAt.slice(0, 10))
                            : <span className="dim">Never</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
