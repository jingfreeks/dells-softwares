import { useParams } from "react-router-dom";
import { AppShell, LoadingSkeleton, StateScreen } from "@/components";
import { amount, formatDate, typeLabel } from "@/lib";
import { useAccountDetail } from "./hooks";
import { closingBalance, withRunningBalance } from "./lib";

export function AccountDetail() {
  const { code } = useParams<{ code: string }>();
  const { account, lines, loading, error, notFound, reload } = useAccountDetail(code);

  if (loading) return <AppShell title="Account"><LoadingSkeleton label="Loading the account" /></AppShell>;

  if (error) {
    return (
      <AppShell title="Account">
        <StateScreen
          icon="ic-warn"
          heading="We couldn't load this account"
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

  if (notFound || !account) {
    return (
      <AppShell title="Account">
        <StateScreen icon="ic-search" heading="No such account">
          There is no account with the code {code} in this chart.
        </StateScreen>
      </AppShell>
    );
  }

  const running = withRunningBalance(lines, account.normalBalance);
  const closing = closingBalance(running);

  return (
    <AppShell title={`${account.code} · ${account.name}`}>
      <div className="pad">
        <div className="row g12">
          <div>
            <div className="t-page">{account.name}</div>
            <div className="t-cap">
              <span className="acode">{account.code}</span> · {typeLabel(account.type)} ·{" "}
              <span className={account.normalBalance === "DEBIT" ? "norm dr" : "norm cr"}>
                {account.normalBalance === "DEBIT" ? "Debit" : "Credit"} normal
              </span>
              {account.parentCode ? ` · under ${account.parentCode}` : ""}
              {account.isSystem ? " · System account" : ""}
            </div>
          </div>
          <div className="sp" />
          <div className="kpi q">
            <div className="t-over">Balance</div>
            <div className="amt amt-lg">{amount(closing)}</div>
          </div>
        </div>

        {running.length === 0 ? (
          <StateScreen icon="ic-ledger" heading="Nothing posted to this account yet">
            Once journal entries are posted against {account.name}, they appear here with a
            running balance.
          </StateScreen>
        ) : (
          <div className="tbl-w">
            <table className="tbl dense">
              <caption className="sr-only">
                Transactions posted to {account.code} {account.name}
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
                {running.map((line, i) => (
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
                  <td className="num"><span className="amt">{amount(closing)}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
