import { useState } from "react";
import { useParams } from "react-router-dom";
import { AppShell, LoadingSkeleton, StateScreen } from "@/components";
import { amount, formatDate } from "@/lib";
import { statusClass } from "@/pages/Journal/lib";
import { useJournalEntry } from "./hooks";

export function JournalDetail() {
  const { id } = useParams<{ id: string }>();
  const { entry, lines, loading, error, working, reverse, reload } = useJournalEntry(id);
  const [reason, setReason] = useState("");
  const [reversing, setReversing] = useState(false);

  if (loading) {
    return <AppShell title="Journal entry"><LoadingSkeleton label="Loading the entry" /></AppShell>;
  }

  if (error && !entry) {
    return (
      <AppShell title="Journal entry">
        <StateScreen icon="ic-warn" heading="We couldn't load this entry" tone="bad"
          action={<button type="button" className="btn" onClick={() => void reload()}>Try again</button>}>
          {error}
        </StateScreen>
      </AppShell>
    );
  }

  if (!entry) {
    return (
      <AppShell title="Journal entry">
        <StateScreen icon="ic-search" heading="No such entry">
          This journal entry does not exist, or belongs to another store.
        </StateScreen>
      </AppShell>
    );
  }

  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  const posted = entry.status === "POSTED";
  const reversed = entry.status === "REVERSED";

  return (
    <AppShell title={entry.entryNo ?? "Draft entry"}>
      <div className="pad">
        <div className="row g12">
          <div>
            <div className="t-page">{entry.description}</div>
            <div className="t-cap">
              <span className="acode">{entry.entryNo ?? "Draft"}</span> · {formatDate(entry.entryDate)}
              {entry.reference ? ` · ${entry.reference}` : ""} · <span className="src">{entry.sourceType}</span>
            </div>
          </div>
          <div className="sp" />
          <span className={statusClass(entry.status)}>{entry.status}</span>
        </div>

        {/* A posted record must not look editable. No Edit action exists on
            this screen at all -- the only way to change a posted entry is to
            post a reversing one, and the bar says so rather than leaving
            someone hunting for a disabled button. */}
        {posted || reversed ? (
          <div className="lockbar" style={{ marginTop: 14 }}>
            This entry is posted and part of the general ledger. It cannot be edited or deleted —
            correct it by posting a reversing entry.
          </div>
        ) : null}

        <div className="tbl-w" style={{ marginTop: 14 }}>
          <table className="tbl dense">
            <caption className="sr-only">Lines of {entry.entryNo ?? "this draft entry"}</caption>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">Description</th>
                <th scope="col" className="num">Debit</th>
                <th scope="col" className="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.lineNo}>
                  <td><span className="acode">{l.accountCode}</span> {l.accountName}</td>
                  <td>{l.description ?? <span className="dim">—</span>}</td>
                  <td className="num">{l.debit === 0 ? "—" : amount(l.debit)}</td>
                  <td className="num">{l.credit === 0 ? "—" : amount(l.credit)}</td>
                </tr>
              ))}
              <tr className="tot">
                <td colSpan={2}>Totals</td>
                <td className="num"><span className="amt">{amount(debit)}</span></td>
                <td className="num"><span className="amt">{amount(credit)}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {debit === credit ? (
          <div className="alert ok" style={{ marginTop: 12 }}>
            <div>Debits and credits both total {amount(debit)}. This entry balances.</div>
          </div>
        ) : (
          <div className="alert bad" style={{ marginTop: 12 }} role="alert">
            <div>This entry does not balance and cannot be posted as it stands.</div>
          </div>
        )}

        {error ? <div className="alert bad" role="alert"><div>{error}</div></div> : null}

        {posted ? (
          <div style={{ marginTop: 18 }}>
            {reversing ? (
              <div className="card">
                <div className="t-sec">Reverse this entry</div>
                <div className="t-cap">
                  A reversing entry dated today will mirror this one, and both stay in the ledger.
                  The reason is written to the audit trail.
                </div>
                <div className="fld" style={{ marginTop: 10 }}>
                  <label className="lbl" htmlFor="reverse-reason">
                    Reason <span style={{ color: "var(--bad)" }}>*</span>
                  </label>
                  <input id="reverse-reason" className="inp" value={reason}
                    onChange={(e) => setReason(e.target.value)} />
                </div>
                <div className="row g8" style={{ marginTop: 10 }}>
                  <button type="button" className="btn" onClick={() => setReversing(false)}>Cancel</button>
                  <button type="button" className="btn p" disabled={working || reason.trim() === ""}
                    onClick={() => void reverse(reason)}>
                    {working ? "Reversing…" : "Post the reversing entry"}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn" onClick={() => setReversing(true)}>
                Reverse this entry
              </button>
            )}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
