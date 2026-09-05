import {
  HEADING_REVIEW_HISTORY,
  BUTTON_REVIEW_VIEW_ALL,
  BUTTON_REVIEW_VIEW,
  TEXT_REVIEW_MONTHLY_STORE_REVIEW,
  TEXT_REVIEW_HISTORY_EMPTY,
  TEXT_REVIEW_HISTORY_EMPTY_BODY,
  ARIA_REVIEW_HISTORY,
  formatDateShort,
  PESO,
} from "@/lib";
import type { ReviewHistoryMonth } from "@/lib";

interface ReviewHistoryCardProps {
  months: ReviewHistoryMonth[];
  /** Omitted on the full history page, where "View all" would point at itself. */
  onViewAll?: () => void;
  onOpen: (month: ReviewHistoryMonth) => void;
}

/** "2026-09" → "September 2026", in the app's pinned locale. */
function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, m - 1, 15)));
}

/**
 * Months there is something to review.
 *
 * NO STATUS COLUMN. The mockup shows a "Reviewed" chip on every row; Product
 * Decisions §3 rules it out, and rightly — nothing sets it, so it would be the
 * same word on every row forever, implying someone checked when nobody has.
 * The row carries what is true instead: what the month sold, and a way in.
 */
export function ReviewHistoryCard({ months, onViewAll, onOpen }: ReviewHistoryCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 0 }}>
      <div className="tpl-sp" style={{ marginBottom: 14 }}>
        <p className="tpl-h3" style={{ margin: 0 }}>
          {HEADING_REVIEW_HISTORY}
        </p>
        {onViewAll && months.length > 0 && (
          <button type="button" className="tpl-txt" onClick={onViewAll}>
            {BUTTON_REVIEW_VIEW_ALL}
          </button>
        )}
      </div>

      {months.length === 0 ? (
        <>
          <p className="tpl-sub" style={{ marginBottom: 4 }}>
            {TEXT_REVIEW_HISTORY_EMPTY}
          </p>
          <p className="tpl-ns" style={{ color: "var(--tpl-t5)", margin: 0 }}>
            {TEXT_REVIEW_HISTORY_EMPTY_BODY}
          </p>
        </>
      ) : (
        <ul aria-label={ARIA_REVIEW_HISTORY} style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {months.map((entry) => (
            <li
              key={entry.month}
              className="tpl-sp"
              style={{ padding: "9px 0", borderBottom: "0.5px solid var(--tpl-bd3)", gap: 10 }}
            >
              <span className="tpl-flex1" style={{ minWidth: 0 }}>
                <span style={{ display: "block", color: "var(--tpl-t3)", fontSize: 13.5 }}>
                  {monthLabel(entry.month)}
                </span>
                <span className="tpl-ns" style={{ color: "var(--tpl-t5)" }}>
                  {TEXT_REVIEW_MONTHLY_STORE_REVIEW} · {formatDateShort(entry.from)}–
                  {formatDateShort(entry.to)} · {PESO.format(entry.salesTotal)}
                </span>
              </span>
              <button
                type="button"
                className="tpl-txt"
                style={{ whiteSpace: "nowrap" }}
                onClick={() => onOpen(entry)}
              >
                {BUTTON_REVIEW_VIEW}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
