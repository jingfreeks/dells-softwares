import { LABEL_USUAL_SHIFT, TEXT_OPTIONAL_LOWER, LABEL_SHIFT_MORNING, LABEL_SHIFT_AFTERNOON, LABEL_SHIFT_NONE } from "@/lib";
import type { ShiftSelection } from "../../../lib";

const SHIFTS: { value: ShiftSelection; label: string }[] = [
  { value: "morning", label: LABEL_SHIFT_MORNING },
  { value: "afternoon", label: LABEL_SHIFT_AFTERNOON },
  { value: "none", label: LABEL_SHIFT_NONE },
];

interface ShiftSelectorProps {
  value: ShiftSelection;
  onChange: (value: ShiftSelection) => void;
}

export function ShiftSelector({ value, onChange }: ShiftSelectorProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="tpl-lbl">
        {LABEL_USUAL_SHIFT} <span style={{ color: "var(--tpl-t7)" }}>· {TEXT_OPTIONAL_LOWER}</span>
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {SHIFTS.map((shift) => (
          <button
            key={shift.value}
            type="button"
            aria-pressed={value === shift.value}
            onClick={() => onChange(shift.value)}
            className={`tpl-chip${value === shift.value ? " tpl-on" : ""}`}
            style={{ cursor: "pointer" }}
          >
            {shift.label}
          </button>
        ))}
      </div>
    </div>
  );
}
