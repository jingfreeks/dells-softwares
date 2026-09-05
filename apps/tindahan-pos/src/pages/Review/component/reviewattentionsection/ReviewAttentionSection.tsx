import {
  HEADING_REVIEW_ATTENTION,
  LABEL_REVIEW_ITEMS_SUFFIX,
  LABEL_REVIEW_GOOD,
} from "@/lib";

export interface AttentionItem {
  key: string;
  title: string;
  body: string;
  /** Omitted for an item that is reporting good news — there is nothing to go and do. */
  actionLabel?: string;
  onAction?: () => void;
  /** Reads as reassurance rather than a problem. */
  good?: boolean;
}

interface ReviewAttentionSectionProps {
  items: AttentionItem[];
}

/**
 * The section the design calls the most important one, and the reason Review
 * is not "another dashboard with more numbers": every row is a thing that
 * happened, said in a sentence, with the screen that acts on it one click away.
 *
 * The count in the header is of items that NEED something, not of rows — a
 * "3 items" beside four rows is correct when one of them is good news.
 */
export function ReviewAttentionSection({ items }: ReviewAttentionSectionProps) {
  const needsAction = items.filter((i) => !i.good).length;

  return (
    <div className="tpl-card" style={{ marginBottom: 11 }}>
      <div className="tpl-sp" style={{ marginBottom: 12 }}>
        <p className="tpl-h3" style={{ margin: 0 }}>
          {HEADING_REVIEW_ATTENTION}
        </p>
        {needsAction > 0 && (
          <span className="tpl-chip tpl-w">
            {needsAction} {LABEL_REVIEW_ITEMS_SUFFIX}
          </span>
        )}
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item) => (
          <li
            key={item.key}
            className="tpl-sp"
            style={{
              padding: "10px 0",
              borderBottom: "0.5px solid var(--tpl-bd3)",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div className="tpl-flex1">
              <p
                style={{
                  fontSize: 13.5,
                  color: item.good ? "var(--tpl-t4)" : "var(--tpl-t3)",
                  margin: 0,
                  fontWeight: item.good ? 400 : 500,
                }}
              >
                {item.title}
              </p>
              <p className="tpl-ns" style={{ color: "var(--tpl-t5)", margin: "2px 0 0" }}>
                {item.body}
              </p>
            </div>
            {item.good ? (
              <span className="tpl-chip tpl-g">{LABEL_REVIEW_GOOD}</span>
            ) : (
              item.actionLabel && (
                <button type="button" className="tpl-txt" style={{ whiteSpace: "nowrap" }} onClick={item.onAction}>
                  {item.actionLabel}
                </button>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
