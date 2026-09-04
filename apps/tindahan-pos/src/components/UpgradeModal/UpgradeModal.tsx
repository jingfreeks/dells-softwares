import { Link } from "react-router-dom";
import {
  ARIA_CLOSE_MODAL,
  TEXT_PLAN_UPGRADE_PREFIX,
  TEXT_PLAN_UNLOCKS_PREFIX,
  TEXT_PLAN_LOCKED_HINT,
  BUTTON_COMPARE_PLANS,
  BUTTON_MAYBE_LATER,
  type LockedByPlan,
} from "@/lib";
import { Modal } from "../Modal";

interface UpgradeModalProps {
  /** null closes the modal -- same "no group, nothing to show" shape as usePlanPage's own lockedByPlan entries. */
  group: LockedByPlan | null;
  onClose: () => void;
}

/**
 * The upgrade interstitial the pricing document asked for: reachable from
 * wherever a locked capability is visible (the plan page's own locked list
 * today), it says what the feature is for, which plan carries it, and what
 * that plan costs -- instead of leaving "not in your plan" as a dead end.
 *
 * There is no checkout flow in this app -- plans are sold by a human, not a
 * card form -- so the CTA is "Compare plans", which goes to /settings/plan
 * (the page this modal is usually opened from) rather than a fake "Upgrade"
 * button that would submit nothing.
 */
export function UpgradeModal({ group, onClose }: UpgradeModalProps) {
  if (!group) return null;

  const headingId = "upgradeModalHeading";

  return (
    <Modal open onClose={onClose} labelledBy={headingId}>
        <div className="tpl-sp" style={{ marginBottom: 14, alignItems: "flex-start" }}>
          <div>
            <p id={headingId} className="tpl-h3" style={{ marginBottom: 4 }}>
              {TEXT_PLAN_UPGRADE_PREFIX}
              {group.plan.name}
            </p>
            <p className="tpl-sub" style={{ margin: 0 }}>
              {TEXT_PLAN_UNLOCKS_PREFIX}
              {group.plan.name} — {group.priceLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={ARIA_CLOSE_MODAL}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 18, padding: 4 }}
          >
            <i className="ti ti-x" aria-hidden />
          </button>
        </div>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, marginBottom: 14 }}>
          {group.features.map((f) => (
            <li key={f.code} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", color: "var(--tpl-t2)" }}>
              <i className="ti ti-lock" aria-hidden style={{ fontSize: 15 }} />
              <span style={{ fontSize: 14 }}>{f.name}</span>
            </li>
          ))}
        </ul>

        <p className="tpl-hint" style={{ marginBottom: 18 }}>
          {TEXT_PLAN_LOCKED_HINT}
        </p>

        <div className="tpl-row" style={{ marginTop: 0 }}>
          <button type="button" onClick={onClose} className="tpl-btn" style={{ flex: 1, marginBottom: 0 }}>
            {BUTTON_MAYBE_LATER}
          </button>
          <Link
            to="/settings/plan"
            onClick={onClose}
            className="tpl-btnp"
            style={{ flex: 1.3, marginBottom: 0, textAlign: "center", textDecoration: "none" }}
          >
            {BUTTON_COMPARE_PLANS}
          </Link>
        </div>
    </Modal>
  );
}
