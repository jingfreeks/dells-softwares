import { Navigate, useNavigate } from "react-router-dom";
import {
  HEADING_REVIEW_HISTORY,
  TEXT_REVIEW_DESCRIPTION,
  TEXT_REVIEW_ERROR_HEADING,
  TEXT_REVIEW_ERROR_BODY,
  BUTTON_TRY_AGAIN,
  LABEL_LOADING,
} from "@/lib";
import { ReviewHistoryCard } from "./component";
import { useReviewEntitlement, useReviewHistory } from "./hooks";

/**
 * The full history list.
 *
 * Gated through the same useReviewEntitlement() the dashboard and the low-stock
 * detail use, so a third route cannot gate itself a third way. A store without
 * the entitlement is sent to /review, where the upgrade screen lives.
 */
export function ReviewHistory() {
  const entitled = useReviewEntitlement();
  const { state, months, retry } = useReviewHistory();
  const navigate = useNavigate();

  if (entitled === null) {
    return (
      <div className="tpl-root" style={{ padding: 18 }}>
        <p className="tpl-sub">{LABEL_LOADING}</p>
      </div>
    );
  }
  if (!entitled) return <Navigate to="/review" replace />;

  return (
    <div className="tpl-root" style={{ padding: 18 }}>
      <div className="tpl-hd">
        <div>
          <p className="tpl-h1" style={{ fontSize: 21 }}>
            {HEADING_REVIEW_HISTORY}
          </p>
          <p className="tpl-sub">{TEXT_REVIEW_DESCRIPTION}</p>
        </div>
      </div>

      {state === "loading" && <p className="tpl-sub">{LABEL_LOADING}</p>}

      {state === "error" && (
        <div className="tpl-card" style={{ textAlign: "center", padding: 28 }}>
          <p className="tpl-h3" style={{ marginBottom: 6 }}>
            {TEXT_REVIEW_ERROR_HEADING}
          </p>
          <p className="tpl-sub" style={{ marginBottom: 18 }}>
            {TEXT_REVIEW_ERROR_BODY}
          </p>
          <button type="button" className="tpl-btnp" style={{ marginBottom: 0 }} onClick={() => void retry()}>
            {BUTTON_TRY_AGAIN}
          </button>
        </div>
      )}

      {state === "ready" && (
        <ReviewHistoryCard
          months={months}
          // No "View all" here — it would point at this page.
          onOpen={(entry) =>
            navigate("/review", { state: { period: { from: entry.from, to: entry.to } } })
          }
        />
      )}
    </div>
  );
}
