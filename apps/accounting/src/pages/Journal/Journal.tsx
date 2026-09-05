import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, LoadingSkeleton, StateScreen } from "@/components";
import { amount, formatDate } from "@/lib";
import { useJournalEntries } from "./hooks";
import { filterEntries, statusClass, statusCounts, STATUS_TABS, type StatusTab } from "./lib";

export function Journal() {
  const { entries, loading, error, reload } = useJournalEntries();
  const [tab, setTab] = useState<StatusTab>("ALL");
  const [search, setSearch] = useState("");

  if (loading) {
    return (
      <AppShell title="Journal Entries">
        <LoadingSkeleton label="Loading journal entries" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Journal Entries">
        <StateScreen
          icon="ic-warn"
          heading="We couldn't load the journal"
          tone="bad"
          action={
            <button type="button" className="btn" onClick={() => void reload()}>
              Try again
            </button>
          }
        >
          {error}
        </StateScreen>
      </AppShell>
    );
  }

  const counts = statusCounts(entries);
  const shown = filterEntries(entries, { tab, search });

  return (
    <AppShell title="Journal Entries">
      <div className="pad">
        <div className="row g12">
          <div>
            <div className="t-page">Journal Entries</div>
            <div className="t-cap">
              Every entry, posted or not. Drafts are excluded from the general ledger and from
              every report until they are posted.
            </div>
          </div>
          <div className="sp" />
          <Link className="btn p" to="/journal/new">
            New journal entry
          </Link>
        </div>

        <div className="tabs" role="tablist">
          {STATUS_TABS.map(({ tab: t, label }) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? "tab on" : "tab"}
              onClick={() => setTab(t)}
            >
              {label} <span className="cnt">{counts[t]}</span>
            </button>
          ))}
        </div>

        <div className="tbar">
          <label className="sr-only" htmlFor="journal-search">
            Search description, entry number or reference
          </label>
          <input
            id="journal-search"
            className="inp"
            style={{ width: 300 }}
            placeholder="Search description, number or reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {entries.length === 0 ? (
          <StateScreen icon="ic-journal" heading="No journal entries yet">
            Entries you create by hand appear here, alongside the ones the Tindahan POS
            integrations will post for you.
          </StateScreen>
        ) : shown.length === 0 ? (
          <StateScreen icon="ic-search" heading="No entries match">
            Nothing in the journal matches that tab and search.
          </StateScreen>
        ) : (
          <div className="tbl-w">
            <table className="tbl dense">
              <caption className="sr-only">Journal entries</caption>
              <thead>
                <tr>
                  <th scope="col">Entry</th>
                  <th scope="col">Date</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Description</th>
                  <th scope="col">Source</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link to={`/journal/${e.id}`} className="acode">
                        {e.entryNo ?? "Draft"}
                      </Link>
                    </td>
                    <td>{formatDate(e.entryDate)}</td>
                    <td>{e.reference ?? <span className="dim">—</span>}</td>
                    <td>{e.description}</td>
                    <td><span className="src">{e.sourceType}</span></td>
                    <td>
                      {/* The word, not just the colour -- §47. */}
                      <span className={statusClass(e.status)}>{e.status}</span>
                    </td>
                    <td className="num"><span className="amt">{amount(e.total)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
