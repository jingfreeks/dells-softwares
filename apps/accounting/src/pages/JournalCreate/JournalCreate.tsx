import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell, LoadingSkeleton, StateScreen } from "@/components";
import { amount, type DraftLine } from "@/lib";
import { INITIAL_LINES, useJournalForm } from "./hooks";
import { periodFor, postBlocker, totals, usableLines, type PostBlocker } from "./lib";

/** The design's §5: state the fix, not the rule. */
function blockerMessage(blocker: PostBlocker, difference: number): string {
  switch (blocker) {
    case "no-description":
      return "Give the entry a description before posting it.";
    case "needs-two-lines":
      return "An entry needs at least two lines, each with an account and one amount.";
    case "not-balanced":
      return difference > 0
        ? `Credit total is ${amount(difference)} short of the debit total.`
        : `Debit total is ${amount(-difference)} short of the credit total.`;
    case "period-not-open":
      return "That date is not inside an open accounting period, so it cannot be posted.";
  }
}

export function JournalCreate() {
  const navigate = useNavigate();
  const { accounts, periods, loading, saving, error, save } = useJournalForm();

  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(INITIAL_LINES);

  if (loading) {
    return (
      <AppShell title="New journal entry">
        <LoadingSkeleton label="Loading the chart of accounts" />
      </AppShell>
    );
  }

  if (accounts.length === 0) {
    return (
      <AppShell title="New journal entry">
        <StateScreen icon="ic-tree" heading="Set up your chart of accounts first">
          A journal entry needs accounts to post into. Open the Chart of Accounts and install the
          starter structure.
        </StateScreen>
      </AppShell>
    );
  }

  const t = totals(lines);
  const blocker = postBlocker(lines, description, entryDate, periods);
  const period = periodFor(entryDate, periods);

  function setLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function submit(alsoPost: boolean) {
    const id = await save(
      { entryDate, description, reference, lines: usableLines(lines) },
      alsoPost
    );
    if (id) navigate(`/journal/${id}`);
  }

  return (
    <AppShell title="New journal entry">
      <div className="pad">
        <div className="t-page">New journal entry</div>

        {/* The period is stated before the form is filled in, not after it is
            submitted -- the design puts this ribbon above the fields for
            exactly that reason. */}
        <div className={period?.status === "OPEN" ? "ribbon" : "ribbon warn"}>
          {period
            ? `Posting into ${period.code} · ${period.status === "OPEN" ? "Open" : "Closed"}`
            : "That date is not inside any accounting period."}
        </div>

        <div className="row g12" style={{ marginTop: 14 }}>
          <div className="fld">
            <label className="lbl" htmlFor="entry-date">Date <span style={{ color: "var(--bad)" }}>*</span></label>
            <input id="entry-date" className="inp" type="date" value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="fld" style={{ flex: 1 }}>
            <label className="lbl" htmlFor="entry-desc">Description <span style={{ color: "var(--bad)" }}>*</span></label>
            <input id="entry-desc" className="inp" value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="fld">
            <label className="lbl" htmlFor="entry-ref">Reference <span className="mut">optional</span></label>
            <input id="entry-ref" className="inp" value={reference}
              onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>

        <div className="tbl-w" style={{ marginTop: 14 }}>
          <table className="tbl dense">
            <caption className="sr-only">Journal entry lines</caption>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">Line description</th>
                <th scope="col" className="num">Debit</th>
                <th scope="col" className="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i}>
                  <td>
                    <label className="sr-only" htmlFor={`line-account-${i}`}>Account for line {i + 1}</label>
                    <select id={`line-account-${i}`} className="inp" value={line.accountCode}
                      onChange={(e) => setLine(i, { accountCode: e.target.value })}>
                      <option value="">Choose an account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.code}>{a.code} · {a.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <label className="sr-only" htmlFor={`line-desc-${i}`}>Description for line {i + 1}</label>
                    <input id={`line-desc-${i}`} className="inp" value={line.description}
                      onChange={(e) => setLine(i, { description: e.target.value })} />
                  </td>
                  <td className="num">
                    <label className="sr-only" htmlFor={`line-debit-${i}`}>Debit for line {i + 1}</label>
                    <input id={`line-debit-${i}`} className="inp amt" inputMode="decimal" value={line.debit}
                      onChange={(e) => setLine(i, { debit: e.target.value, credit: "" })} />
                  </td>
                  <td className="num">
                    <label className="sr-only" htmlFor={`line-credit-${i}`}>Credit for line {i + 1}</label>
                    <input id={`line-credit-${i}`} className="inp amt" inputMode="decimal" value={line.credit}
                      onChange={(e) => setLine(i, { credit: e.target.value, debit: "" })} />
                  </td>
                </tr>
              ))}
              <tr className="tot">
                <td colSpan={2}>Totals</td>
                <td className="num"><span className="amt">{amount(t.debit)}</span></td>
                <td className="num"><span className="amt">{amount(t.credit)}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="row g8" style={{ marginTop: 10 }}>
          <button type="button" className="btn"
            onClick={() => setLines((prev) => [...prev, { accountCode: "", description: "", debit: "", credit: "" }])}>
            Add a line
          </button>
        </div>

        <div className={t.balanced ? "alert ok" : "alert bad"} style={{ marginTop: 14 }} role="status">
          <div>
            {t.balanced ? (
              <><b>Balanced.</b> Debits and credits both total {amount(t.debit)}.</>
            ) : (
              <><b>Not balanced.</b> {blockerMessage("not-balanced", t.difference)}</>
            )}
          </div>
        </div>

        {blocker && blocker !== "not-balanced" ? (
          <div className="alert warn" role="alert">
            <div>{blockerMessage(blocker, t.difference)}</div>
          </div>
        ) : null}

        {error ? (
          <div className="alert bad" role="alert">
            <div>{error}</div>
          </div>
        ) : null}

        <div className="row g8" style={{ marginTop: 14 }}>
          {/* Save as draft stays enabled while unbalanced -- the design is
              explicit that an unfinished entry must still be keepable. */}
          <button type="button" className="btn" disabled={saving} onClick={() => void submit(false)}>
            Save as draft
          </button>
          <button type="button" className="btn p" disabled={saving || blocker !== null}
            onClick={() => void submit(true)}>
            {saving ? "Posting…" : "Post entry"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
