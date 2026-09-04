import { useNavigate } from "react-router-dom";
import {
  PAGE_HEADING_REVIEW,
  TEXT_REVIEW_LOCKED_SUBHEADING,
  TEXT_REVIEW_LOCKED_TITLE,
  TEXT_REVIEW_LOCKED_BENEFIT_SALES,
  TEXT_REVIEW_LOCKED_BENEFIT_STOCK,
  TEXT_REVIEW_LOCKED_BENEFIT_UTANG,
  TEXT_REVIEW_LOCKED_BENEFIT_ATTENTION,
  TEXT_REVIEW_LOCKED_BENEFIT_PERFORMANCE,
  BUTTON_UPGRADE_TO_GROWTH,
  ARIA_REVIEW_LOCKED_BENEFITS,
} from "@/lib";

const BENEFITS = [
  TEXT_REVIEW_LOCKED_BENEFIT_SALES,
  TEXT_REVIEW_LOCKED_BENEFIT_STOCK,
  TEXT_REVIEW_LOCKED_BENEFIT_UTANG,
  TEXT_REVIEW_LOCKED_BENEFIT_ATTENTION,
  TEXT_REVIEW_LOCKED_BENEFIT_PERFORMANCE,
];

/**
 * The Starter/Growth upsell.
 *
 * Marketing only. No Review data is fetched to render this -- the page never
 * calls review_summary() for a store without the entitlement, and the server
 * would refuse it if it did. There is nothing here to hide, because nothing
 * was requested.
 *
 * The tick is a decorative span with the text beside it, not an icon carrying
 * meaning on its own: the benefit list has to read the same to a screen reader
 * as it does on screen.
 */
export function ReviewLockedState() {
  const navigate = useNavigate();

  return (
    <div className="tpl-card" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: 28 }}>
      <p className="tpl-h1" style={{ fontSize: 21, marginBottom: 6 }}>
        {PAGE_HEADING_REVIEW}
      </p>
      <p className="tpl-sub" style={{ marginBottom: 20 }}>
        {TEXT_REVIEW_LOCKED_SUBHEADING}
      </p>

      <p className="tpl-h3" style={{ marginBottom: 14 }}>
        {TEXT_REVIEW_LOCKED_TITLE}
      </p>

      <ul
        aria-label={ARIA_REVIEW_LOCKED_BENEFITS}
        style={{ listStyle: "none", padding: 0, margin: "0 auto 22px", maxWidth: 320, textAlign: "left" }}
      >
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="tpl-sp" style={{ padding: "7px 0", justifyContent: "flex-start", gap: 10 }}>
            <span aria-hidden style={{ color: "var(--tpl-okd)", fontSize: 15 }}>
              &#10003;
            </span>
            <span style={{ color: "var(--tpl-t4)", fontSize: 13.5 }}>{benefit}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="tpl-btnp"
        style={{ marginBottom: 0 }}
        onClick={() => navigate("/settings/plan")}
      >
        {BUTTON_UPGRADE_TO_GROWTH}
      </button>
    </div>
  );
}
