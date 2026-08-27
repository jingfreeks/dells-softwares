export type Variant = "default" | "positive" | "warning" | "highlight" | "danger";

export interface MetricCardProps {
  label: string;
  value: string;
  /** Sub-caption, e.g. "▲ 12% vs yesterday" or "Restock today" (§5 M-004). */
  caption?: string;
  variant?: Variant;
  /** Grid width share, e.g. "31%" for a 3-column row (Restock's OUT/CRITICAL/LOW tiles). Defaults to the 2x2 grid's ~48%. */
  flexBasis?: string;
}
