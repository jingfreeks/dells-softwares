import type { FeatureCardProps } from "./types";

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="tland-fcard">
      <div className="tland-ficon">{icon}</div>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14.5, color: "var(--tpl-t6)" }}>{description}</p>
    </div>
  );
}
