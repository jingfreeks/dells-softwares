const MAX_VISIBLE_FEATURES = 6;

interface PlanCardProps {
  name: string;
  priceLabel: string;
  /** Real feature names from my_store_features()'s catalogue -- never invented marketing copy. */
  featureNames: string[];
  isCurrent: boolean;
  canStartTrial: boolean;
  justStarted: boolean;
  onChoose: () => void;
}

export function PlanCard({
  name,
  priceLabel,
  featureNames,
  isCurrent,
  canStartTrial,
  justStarted,
  onChoose,
}: PlanCardProps) {
  const visible = featureNames.slice(0, MAX_VISIBLE_FEATURES);
  const remaining = featureNames.length - visible.length;

  return (
    <div className="tpl-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
      <p className="tpl-h3" style={{ fontSize: 18 }}>
        {name}
      </p>
      <p style={{ color: "var(--tpl-t1)", fontSize: 22, fontWeight: 600 }}>{priceLabel}</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {visible.map((featureName) => (
          <li
            key={featureName}
            className="tpl-ts"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <i className="ti ti-check tpl-ok" style={{ fontSize: 13 }} aria-hidden />
            {featureName}
          </li>
        ))}
      </ul>
      {remaining > 0 && <p className="tpl-ts">+{remaining} more</p>}
      <button
        type="button"
        disabled={isCurrent || justStarted}
        onClick={onChoose}
        className={isCurrent ? "tpl-btn" : "tpl-btnp"}
        style={{ marginTop: "auto" }}
      >
        {isCurrent
          ? "Current plan"
          : justStarted
            ? "Trial started"
            : canStartTrial
              ? "Start free trial"
              : "Ask about this plan"}
      </button>
    </div>
  );
}
