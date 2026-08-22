import { useState } from "react";
import {
  PAGE_HEADING_YOUR_PLAN,
  TEXT_PLAN_DESCRIPTION,
  TEXT_PLAN_INCLUDED,
  TEXT_PLAN_NOT_INCLUDED,
  TEXT_PLAN_ALL_INCLUDED,
  TEXT_PLAN_LOCKED_HINT,
  TEXT_PLAN_UPGRADE_PREFIX,
  TEXT_PLAN_WRITES_PAUSED,
  ARIA_VIEW_UPGRADE_OPTIONS,
} from "@/lib";
import { UpgradeModal } from "@/components";
import { SettingsLayout } from "./component";
import { usePlanPage, type PlanGroup, type LockedByPlan } from "./usePlanPage";

function FeatureRow({ name, held }: { name: string; held: boolean }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0",
        // Explicit tokens rather than an opacity on inherited colour: a bare
        // span here inherits a dark default and renders effectively
        // invisible on this theme. Held reads at full strength, locked is
        // muted but still legible -- the tenant is meant to READ what they
        // are missing, not squint at it.
        color: held ? "var(--tpl-t2)" : "var(--tpl-t6)",
      }}
    >
      <i className={`ti ${held ? "ti-check" : "ti-lock"}`} aria-hidden style={{ fontSize: 15 }} />
      <span style={{ fontSize: 14 }}>{name}</span>
    </li>
  );
}

/** What this store already has, grouped by module -- "you have Selling" is a sentence once it's yours. */
function HeldList({ groups }: { groups: PlanGroup[] }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.moduleCode} style={{ marginBottom: 14 }}>
          <p className="tpl-sub" style={{ marginBottom: 6, fontWeight: 600 }}>
            {g.label}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {g.features.map((f) => (
              <FeatureRow key={f.code} name={f.name} held />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/**
 * What this store does not have, grouped by the cheapest plan that would
 * unlock it and priced right there -- "Purchase orders, not in your plan" has
 * no next step; "Purchase orders — Upgrade to Business, ₱599/month" is a
 * decision a shopkeeper can actually make.
 */
function LockedByPlanList({ groups, onSelect }: { groups: LockedByPlan[]; onSelect: (group: LockedByPlan) => void }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.plan.planCode} style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => onSelect(g)}
            aria-label={`${ARIA_VIEW_UPGRADE_OPTIONS}: ${g.plan.name}`}
            className="tpl-sub"
            style={{
              marginBottom: 6,
              fontWeight: 600,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              textAlign: "left",
            }}
          >
            {TEXT_PLAN_UPGRADE_PREFIX}
            {g.plan.name} — {g.priceLabel}
            <i className="ti ti-chevron-right" aria-hidden style={{ fontSize: 13 }} />
          </button>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {g.features.map((f) => (
              <FeatureRow key={f.code} name={f.name} held={false} />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/**
 * What this store can do, what it cannot, and what getting the rest would
 * cost.
 *
 * Deliberately shows the locked capabilities rather than hiding them —
 * my_store_features() returns the whole catalogue for exactly this reason. A
 * shopkeeper who cannot see that purchase orders exist has no way to ask for
 * them, and a tier nobody can see is a tier nobody buys.
 *
 * The locked section is grouped by PLAN, not module, and priced — unlike the
 * held section, which stays grouped by module because "you have Selling"
 * only needs to be legible, not sold. plan_prices() supplies real numbers now
 * (20260815120000); an earlier version of this page said nothing about price
 * because there was none to say.
 */
export function PlanSettings() {
  const { loading, held, lockedByPlan, holdsEverything, writesPaused } = usePlanPage();
  const [upgradeTarget, setUpgradeTarget] = useState<LockedByPlan | null>(null);

  return (
    <SettingsLayout>
      <div className="tpl-hd">
        <div>
          <p className="tpl-h1" style={{ fontSize: 21 }}>
            {PAGE_HEADING_YOUR_PLAN}
          </p>
          <p className="tpl-sub">{TEXT_PLAN_DESCRIPTION}</p>
        </div>
      </div>

      {writesPaused && (
        <div className="tpl-card" style={{ marginBottom: 14 }} role="status">
          <p className="tpl-sub" style={{ margin: 0 }}>
            {TEXT_PLAN_WRITES_PAUSED}
          </p>
        </div>
      )}

      {!loading && (
        <>
          <div className="tpl-card" style={{ marginBottom: 14 }}>
            <p className="tpl-h3" style={{ marginBottom: 10 }}>
              {TEXT_PLAN_INCLUDED}
            </p>
            <HeldList groups={held} />
          </div>

          {holdsEverything ? (
            <p className="tpl-sub">{TEXT_PLAN_ALL_INCLUDED}</p>
          ) : (
            lockedByPlan.length > 0 && (
              <div className="tpl-card">
                <p className="tpl-h3" style={{ marginBottom: 10 }}>
                  {TEXT_PLAN_NOT_INCLUDED}
                </p>
                <LockedByPlanList groups={lockedByPlan} onSelect={setUpgradeTarget} />
                <p className="tpl-sub" style={{ marginTop: 8 }}>
                  {TEXT_PLAN_LOCKED_HINT}
                </p>
              </div>
            )
          )}
        </>
      )}

      <UpgradeModal group={upgradeTarget} onClose={() => setUpgradeTarget(null)} />
    </SettingsLayout>
  );
}
