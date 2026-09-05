import { useState } from "react";
import { AppShell, LoadingSkeleton, StateScreen } from "@/components";
import { ACCOUNT_TYPES, type AccountType } from "@/lib";
import { AccountsTable } from "./component";
import { useChartOfAccounts } from "./hooks";
import { filterAccounts } from "./lib";

export function Accounts() {
  const { accounts, loading, error, seeding, seed, reload } = useChartOfAccounts();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<AccountType | "ALL">("ALL");
  const [activeOnly, setActiveOnly] = useState(false);

  if (loading) return <AppShell title="Chart of Accounts"><LoadingSkeleton label="Loading the chart of accounts" /></AppShell>;

  if (error) {
    return (
      <AppShell title="Chart of Accounts">
        <StateScreen
          icon="ic-warn"
          heading="We couldn't load the chart of accounts"
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

  if (accounts.length === 0) {
    return (
      <AppShell title="Chart of Accounts">
        <StateScreen
          icon="ic-tree"
          heading="No accounts yet"
          action={
            <button type="button" className="btnp" onClick={() => void seed()} disabled={seeding}>
              {seeding ? "Setting up…" : "Set up the starter chart"}
            </button>
          }
        >
          Set up your Chart of Accounts to start recording financial transactions. The starter
          structure gives you the six standard groups and the accounts the Tindahan POS
          integrations will post into — you can add your own afterwards.
        </StateScreen>
      </AppShell>
    );
  }

  const shown = filterAccounts(accounts, { search, type, activeOnly });

  return (
    <AppShell title="Chart of Accounts">
      <div className="pad">
        <div className="row g12">
          <div>
            <div className="t-page">Chart of Accounts</div>
            <div className="t-cap">
              The account structure every journal entry posts into. Accounts used by POS
              integrations cannot be deleted, only deactivated.
            </div>
          </div>
        </div>

        <div className="tbar">
          <label className="sr-only" htmlFor="account-search">
            Search code or account name
          </label>
          <input
            id="account-search"
            className="inp"
            style={{ width: 280 }}
            placeholder="Search code or account name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="pchips">
            <button
              type="button"
              className={type === "ALL" ? "pchip on" : "pchip"}
              onClick={() => setType("ALL")}
            >
              All
            </button>
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                className={type === t.type ? "pchip on" : "pchip"}
                onClick={() => setType(t.type)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="sp" />
          <label className="pill">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Active only
          </label>
        </div>

        {/*
          Handoff open question 1 asked whether to keep the Balance column,
          "genuinely useful but it may be expensive to compute". It is not here
          yet, and this says so rather than leaving a reader to wonder. The
          honest way to produce it is the per-account aggregate the Trial
          Balance needs anyway (chunk E1); the dishonest way is to download
          every ledger line into the browser and add them up, which is exactly
          the cost the question was about.
        */}
        <div className="alert info" style={{ marginTop: 14 }}>
          <div>
            <b>Balances are not shown here yet.</b> They arrive with the Trial Balance, which
            computes them in the database. Open an account to see its transactions and running
            balance.
          </div>
        </div>

        {shown.length === 0 ? (
          <StateScreen icon="ic-search" heading="No accounts match">
            Nothing in the chart matches that search and filter.
          </StateScreen>
        ) : (
          <AccountsTable accounts={shown} />
        )}
      </div>
    </AppShell>
  );
}
