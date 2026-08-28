import { Link } from "react-router-dom";
import { useOnboardingChecklist } from "./useOnboardingChecklist";

/** Approved design screen 45. Hidden once every item is done -- there's nothing left to nudge toward. */
export function OnboardingChecklistCard() {
  const { items, doneCount, total, allDone } = useOnboardingChecklist();

  if (allDone) return null;

  const percent = Math.round((doneCount / total) * 100);

  return (
    <div className="tpl-card" style={{ marginBottom: 14 }}>
      <div className="tpl-sp" style={{ marginBottom: 10 }}>
        <p className="tpl-h3" style={{ margin: 0 }}>
          Getting set up
        </p>
        <span className="tpl-ts">
          {doneCount} of {total} done
        </span>
      </div>
      <div className="tpl-bar" style={{ marginBottom: 10 }}>
        <i style={{ width: `${percent}%` }} />
      </div>
      {items.map((item) => (
        <div key={item.label} className="tpl-lr" style={{ padding: "6px 0" }}>
          <i
            className={item.done ? "ti ti-circle-check tpl-ok" : "ti ti-circle"}
            style={{ fontSize: 17, color: item.done ? undefined : "var(--tpl-t8)" }}
            aria-hidden
          />
          <div className="tpl-flex1">
            <p className="tpl-tp" style={{ textDecoration: item.done ? "line-through" : "none" }}>
              {item.label}
            </p>
          </div>
          {!item.done && (
            <Link to={item.href} className="tpl-chip">
              Go
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
