import type { ProblemCardProps } from "./types";

export function ProblemCard({ title, description }: ProblemCardProps) {
  return (
    <div className="tland-prob">
      <h3 style={{ marginBottom: 7, fontSize: 16.5 }}>{title}</h3>
      <p style={{ fontSize: 14.5, color: "var(--tpl-t6)" }}>{description}</p>
    </div>
  );
}
