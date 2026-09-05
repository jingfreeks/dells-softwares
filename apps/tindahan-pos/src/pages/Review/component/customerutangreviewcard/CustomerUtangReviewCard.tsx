import {
  HEADING_REVIEW_UTANG,
  BUTTON_REVIEW_OPEN,
  LABEL_REVIEW_OUTSTANDING,
  LABEL_REVIEW_OVERDUE,
  LABEL_REVIEW_WITH_BALANCE,
  HEADING_REVIEW_NEEDS_ATTENTION,
  TEXT_REVIEW_DAYS_OVERDUE_SUFFIX,
  TEXT_REVIEW_NOBODY_OVERDUE,
  PESO,
} from "@/lib";
import type { ReviewOverdueCustomer } from "@/lib";

interface CustomerUtangReviewCardProps {
  outstanding: number;
  overdue: number;
  customersWithBalance: number;
  overdueCustomers: ReviewOverdueCustomer[];
  onOpen: () => void;
}

/**
 * Utang, which for a sari-sari store is the number that keeps people awake.
 *
 * Names appear only for customers actually past the store's own threshold, and
 * only five of them: this is a prompt to go and ask, and the Customers page
 * already exists for the full list. The server caps it too — this is not the
 * only place that decision is enforced.
 */
export function CustomerUtangReviewCard({
  outstanding,
  overdue,
  customersWithBalance,
  overdueCustomers,
  onOpen,
}: CustomerUtangReviewCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 0 }}>
      <div className="tpl-sp" style={{ marginBottom: 14 }}>
        <p className="tpl-h3" style={{ margin: 0 }}>
          {HEADING_REVIEW_UTANG}
        </p>
        <button type="button" className="tpl-txt" onClick={onOpen}>
          {BUTTON_REVIEW_OPEN}
        </button>
      </div>

      <div className="tpl-g3" style={{ marginBottom: 14 }}>
        <div>
          <p className="tpl-lbl" style={{ marginBottom: 3 }}>
            {LABEL_REVIEW_OUTSTANDING}
          </p>
          <p className="tpl-mono" style={{ fontSize: 16, margin: 0 }}>
            {PESO.format(outstanding)}
          </p>
        </div>
        <div>
          <p className="tpl-lbl" style={{ marginBottom: 3 }}>
            {LABEL_REVIEW_OVERDUE}
          </p>
          <p
            className="tpl-mono"
            style={{ fontSize: 16, margin: 0, color: overdue > 0 ? "var(--tpl-bad)" : undefined }}
          >
            {PESO.format(overdue)}
          </p>
        </div>
        <div>
          <p className="tpl-lbl" style={{ marginBottom: 3 }}>
            {LABEL_REVIEW_WITH_BALANCE}
          </p>
          <p className="tpl-mono" style={{ fontSize: 16, margin: 0 }}>
            {customersWithBalance}
          </p>
        </div>
      </div>

      <p className="tpl-lbl" style={{ marginBottom: 8 }}>
        {HEADING_REVIEW_NEEDS_ATTENTION}
      </p>

      {overdueCustomers.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {overdueCustomers.map((customer) => (
            <li key={customer.id} className="tpl-sp" style={{ padding: "6px 0", gap: 10 }}>
              <span className="tpl-flex1" style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    color: "var(--tpl-t4)",
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {customer.name}
                </span>
                <span className="tpl-ns" style={{ color: "var(--tpl-bad)" }}>
                  {customer.daysOverdue} {TEXT_REVIEW_DAYS_OVERDUE_SUFFIX}
                </span>
              </span>
              <span className="tpl-mono" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                {PESO.format(customer.balance)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tpl-sub" style={{ margin: 0 }}>
          {TEXT_REVIEW_NOBODY_OVERDUE}
        </p>
      )}
    </div>
  );
}
