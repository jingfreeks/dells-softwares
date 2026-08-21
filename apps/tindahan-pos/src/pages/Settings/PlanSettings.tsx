import {
  PAGE_HEADING_YOUR_PLAN,
  TEXT_PLAN_DESCRIPTION,
  TEXT_PLAN_INCLUDED,
  TEXT_PLAN_NOT_INCLUDED,
  TEXT_PLAN_ALL_INCLUDED,
  TEXT_PLAN_LOCKED_HINT,
  TEXT_PLAN_WRITES_PAUSED,
} from "@/lib";
import { SettingsLayout } from "./component";
import { usePlanPage, type PlanGroup } from "./usePlanPage";

function GroupList({ groups, held }: { groups: PlanGroup[]; held: boolean }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.moduleCode} style={{ marginBottom: 14 }}>
          <p className="tpl-sub" style={{ marginBottom: 6, fontWeight: 600 }}>
            {g.label}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {g.features.map((f) => (
              <li
                key={f.code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 0",
                  // Explicit tokens rather than an opacity on inherited colour:
                  // a bare span here inherits a dark default and renders
                  // effectively invisible on this theme. Held reads at full
                  // strength, locked is muted but still legible -- the tenant
                  // is meant to READ what they are missing, not squint at it.
                  color: held ? "var(--tpl-t2)" : "var(--tpl-t6)",
                }}
              >
                <i
                  className={`ti ${held ? "ti-check" : "ti-lock"}`}
                  aria-hidden
                  style={{ fontSize: 15 }}
                />
                <span style={{ fontSize: 14 }}>{f.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/**
 * What this store can do, and what it cannot.
 *
 * Deliberately shows the locked capabilities rather than hiding them —
 * my_store_features() returns the whole catalogue for exactly this reason. A
 * shopkeeper who cannot see that purchase orders exist has no way to ask for
 * them, and a tier nobody can see is a tier nobody buys.
 *
 * It does not show a price or offer a checkout: pricing has not been set
 * (core.subscription_plans.price_php is still null above FREE), and inventing
 * one here would be a promise the platform cannot keep.
 */
export function PlanSettings() {
  const { loading, held, locked, holdsEverything, writesPaused } = usePlanPage();

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
            <GroupList groups={held} held />
          </div>

          {holdsEverything ? (
            <p className="tpl-sub">{TEXT_PLAN_ALL_INCLUDED}</p>
          ) : (
            locked.length > 0 && (
              <div className="tpl-card">
                <p className="tpl-h3" style={{ marginBottom: 10 }}>
                  {TEXT_PLAN_NOT_INCLUDED}
                </p>
                <GroupList groups={locked} held={false} />
                <p className="tpl-sub" style={{ marginTop: 8 }}>
                  {TEXT_PLAN_LOCKED_HINT}
                </p>
              </div>
            )
          )}
        </>
      )}
    </SettingsLayout>
  );
}
