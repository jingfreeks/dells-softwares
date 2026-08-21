import { useState } from "react";
import { Link } from "react-router-dom";
import { LABEL_YOUR_PLAN, BUTTON_MANAGE_SUBSCRIPTION, BUTTON_UPGRADE_PLAN, type LockedByPlan } from "@/lib";
import { UpgradeModal } from "@/components";
import { usePlanPage } from "@/pages/Settings/usePlanPage";
import { useCurrentPlan } from "./useCurrentPlan";

/**
 * The dashboard's subscription-awareness widget: what plan this store is on,
 * and -- only when something is actually missing -- one click to see what
 * the next tier would add, rather than sending every visit to Settings to
 * find out.
 *
 * Reuses usePlanPage()'s lockedByPlan (already sorted cheapest-first) rather
 * than re-deriving "what's the next tier" -- the settings page and this
 * widget must never disagree about which plan that is.
 */
export function SubscriptionCard() {
  const { plan, loading: planLoading } = useCurrentPlan();
  const { lockedByPlan, loading: pageLoading } = usePlanPage();
  const [upgradeTarget, setUpgradeTarget] = useState<LockedByPlan | null>(null);

  if (planLoading || !plan) return null;

  const nextTier = !pageLoading && lockedByPlan.length > 0 ? lockedByPlan[0] : null;

  return (
    <div className="tpl-card" style={{ marginBottom: 14 }}>
      <div className="tpl-sp" style={{ alignItems: "center" }}>
        <div>
          <p className="tpl-mlbl" style={{ margin: 0 }}>
            {LABEL_YOUR_PLAN.toUpperCase()}
          </p>
          <p className="tpl-h3" style={{ margin: 0 }}>
            {plan.name} <span className="tpl-sub">— {plan.priceLabel}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {nextTier && (
            <button type="button" onClick={() => setUpgradeTarget(nextTier)} className="tpl-btn" style={{ marginBottom: 0 }}>
              {BUTTON_UPGRADE_PLAN}
            </button>
          )}
          <Link to="/settings/plan" className="tpl-chip" style={{ textDecoration: "none" }}>
            {BUTTON_MANAGE_SUBSCRIPTION}
          </Link>
        </div>
      </div>

      <UpgradeModal group={upgradeTarget} onClose={() => setUpgradeTarget(null)} />
    </div>
  );
}
