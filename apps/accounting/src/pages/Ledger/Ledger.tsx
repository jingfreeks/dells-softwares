import { useState } from "react";
import { AppShell, LoadingSkeleton, StateScreen } from "@/components";
import { amount, formatDate } from "@/lib";
import { useGeneralLedger } from "./hooks";

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export function Ledger() {
  const [from, setFrom] = useState(startOfYear);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { groups, loading, error, reload } = useGeneralLedger(from, to);

  return (
    <AppShell title="General Ledger">
      <div className="pad">
        <div className="t-page">General Ledger</div>
        <div className="t-cap">
          Every posted line, grouped by account. Reversed entries stay, alongside the correcting
          entry that undoes them.
        </div>

        <div className="tbar">
          <div className="fld">
            <label className="lbl" htmlFor="ledger-from">From</label>
            <input id="ledger-from" className="inp" type="date" value={from}
              onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="fld">
            <label className="lbl" htmlFor="ledger-to">To</label>
            <input id="ledger-to" className="inp" type="date" value={to}
              onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {/* The two things that otherwise make a ledger confusing, said on the
            page rather than left to be discovered. */}
        <div className="alert info">
          <div>
            Balances run from zero at the start of this range, not from the account's opening
            balance. <b>Draft entries are excluded</b> — nothing appears here until it is posted.
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton label="Loading the general ledger" />
        ) : error ? (
          <StateScreen icon="ic-warn" heading="We couldn't load the ledger" tone="bad"
            action={<button type="button" className="btn" onClick={() => void reload()}>Try again</button>}>
            {error}
          </StateScreen>
        ) : groups.length === 0 ? (
          <StateScreen icon="ic-ledger" heading="Nothing posted in this range">
            Change the dates, or post a journal entry to see it here.
          </StateScreen>
        ) : (
          groups.map((group) => (
            <div key={group.code} style={{ marginTop: 18 }}>
              <div className="sechead">
                <span className="acode">{group.code}</span> {group.name}
                <span className="sp" />
                <span className={group.normalBalance === "DEBIT" ? "norm dr" : "norm cr"}>
                  {group.normalBalance === "DEBIT" ? "Debit" : "Credit"} normal
                </span>
              </div>
              <div className="tbl-w">
                <table className="tbl dense">
                  <caption className="sr-only">
                    Ledger for {group.code} {group.name}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Entry</th>
                      <th scope="col">Description</th>
                      <th scope="col">Source</th>
                      <th scope="col" className="num">Debit</th>
                      <th scope="col" className="num">Credit</th>
                      <th scope="col" className="num">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.lines.map((line, i) => (
                      <tr key={`${line.entryNo}-${i}`}>
                        <td>{formatDate(line.entryDate)}</td>
                        <td><span className="acode">{line.entryNo}</span></td>
                        <td>{line.description}</td>
                        <td><span className="src">{line.sourceType}</span></td>
                        <td className="num">{line.debit === 0 ? "—" : amount(line.debit)}</td>
                        <td className="num">{line.credit === 0 ? "—" : amount(line.credit)}</td>
                        <td className="num"><span className="amt">{amount(line.balance)}</span></td>
                      </tr>
                    ))}
                    <tr className="tot">
                      <td colSpan={6}>Closing balance</td>
                      <td className="num"><span className="amt">{amount(group.closing)}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
