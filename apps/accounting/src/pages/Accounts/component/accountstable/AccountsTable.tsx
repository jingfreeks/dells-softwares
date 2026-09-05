import { Link } from "react-router-dom";
import { typeLabel, type Account } from "@/lib";
import { groupAccounts } from "../../lib";

/**
 * The chart, grouped and sorted by code.
 *
 * No Balance column yet, and that is a decision rather than an omission --
 * see the note on the page. Everything else the design's table carries is
 * here: code, name, type, parent, normal balance and status.
 */
export function AccountsTable({ accounts }: { accounts: Account[] }) {
  const groups = groupAccounts(accounts);

  if (groups.length === 0) return null;

  return (
    <div className="tbl-w">
      <table className="tbl dense">
        <caption className="sr-only">Chart of accounts, grouped by account type</caption>
        <colgroup>
          <col style={{ width: "10%" }} />
          <col style={{ width: "34%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Code</th>
            <th scope="col">Account name</th>
            <th scope="col">Type</th>
            <th scope="col">Parent account</th>
            <th scope="col" className="c">
              Normal balance
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <>
              <tr className="grp" key={group.type}>
                <td colSpan={6}>{group.label}</td>
              </tr>
              {group.accounts.map((a) => (
                <tr key={a.id} style={a.active ? undefined : { opacity: 0.5 }}>
                  <td>
                    <span className="acode">{a.code}</span>
                  </td>
                  <td>
                    <div className="aname">
                      <Link to={`/accounts/${a.code}`}>{a.name}</Link>
                      {a.isSystem ? (
                        <span className="bdg" style={{ marginLeft: 8 }}>
                          System account
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <span className="mut">{typeLabel(a.type)}</span>
                  </td>
                  <td>{a.parentCode ?? <span className="dim">—</span>}</td>
                  <td className="c">
                    <span className={a.normalBalance === "DEBIT" ? "norm dr" : "norm cr"}>
                      {a.normalBalance === "DEBIT" ? "Debit" : "Credit"}
                    </span>
                  </td>
                  <td>
                    <span className={a.active ? "bdg ok" : "bdg"}>
                      {a.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
