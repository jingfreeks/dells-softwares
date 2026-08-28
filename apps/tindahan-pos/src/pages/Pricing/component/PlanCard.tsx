interface PlanCardProps {
  name: string;
  priceLabel: string;
  featureCount: number;
  isCurrent: boolean;
  canStartTrial: boolean;
  justStarted: boolean;
  onChoose: () => void;
}

export function PlanCard({
  name,
  priceLabel,
  featureCount,
  isCurrent,
  canStartTrial,
  justStarted,
  onChoose,
}: PlanCardProps) {
  return (
    <div className="tpl-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
      <p className="tpl-h3" style={{ fontSize: 18 }}>
        {name}
      </p>
      <p style={{ color: "var(--tpl-t1)", fontSize: 22, fontWeight: 600 }}>{priceLabel}</p>
      <p className="tpl-ts">{featureCount} features included</p>
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
