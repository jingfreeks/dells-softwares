import type { HardwareStepProps } from "./types";

export function HardwareStep({ icon, title, subtitle, highlighted }: HardwareStepProps) {
  return (
    <div
      className="tpl-card tland-hwstep"
      style={
        highlighted
          ? { background: "rgba(76,141,255,.10)", borderColor: "rgba(76,141,255,.32)" }
          : undefined
      }
    >
      {icon}
      <p style={{ fontSize: 12, color: highlighted ? "var(--tpl-t2)" : "var(--tpl-t3)", lineHeight: 1.4, fontWeight: highlighted ? 500 : 400 }}>
        {title}
        <br />
        <span style={{ color: highlighted ? "var(--tpl-a4)" : "var(--tpl-t7)", fontSize: 10.5, fontWeight: 400 }}>
          {subtitle}
        </span>
      </p>
    </div>
  );
}
