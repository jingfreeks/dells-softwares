interface ReviewMetricCardProps {
  /** Uppercase label, as the design sets it. */
  label: string;
  value: string;
  /** The small line under the value — margin, overdue count, low-stock count. */
  detail?: string;
  /**
   * Set when `detail` qualifies how complete the figure is rather than
   * describing it, so it can be rendered as a caveat instead of a fact.
   */
  detailIsCaveat?: boolean;
}

/**
 * One summary metric. Deliberately dumb: it formats nothing and decides
 * nothing, so the page stays the only place that knows what a figure means.
 */
export function ReviewMetricCard({ label, value, detail, detailIsCaveat = false }: ReviewMetricCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 0 }}>
      <p className="tpl-lbl" style={{ marginBottom: 6, letterSpacing: 0.6 }}>
        {label}
      </p>
      <p className="tpl-h2 tpl-mono" style={{ fontSize: 22, marginBottom: 4 }}>
        {value}
      </p>
      {detail && (
        <p
          className="tpl-ns"
          style={{ color: detailIsCaveat ? "#d9a93b" : "var(--tpl-t5)", margin: 0 }}
        >
          {detail}
        </p>
      )}
    </div>
  );
}
