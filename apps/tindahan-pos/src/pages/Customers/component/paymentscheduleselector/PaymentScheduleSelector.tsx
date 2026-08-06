import { LABEL_PAYMENT_SCHEDULE, SCHEDULE_BIWEEKLY, SCHEDULE_WEEKLY, SCHEDULE_NONE } from "@/lib";
import type { PaymentSchedule } from "../../hooks";

const OPTIONS: { value: PaymentSchedule; label: string }[] = [
  { value: "biweekly", label: SCHEDULE_BIWEEKLY },
  { value: "weekly", label: SCHEDULE_WEEKLY },
  { value: "none", label: SCHEDULE_NONE },
];

interface PaymentScheduleSelectorProps {
  value: PaymentSchedule;
  onChange: (value: PaymentSchedule) => void;
}

export function PaymentScheduleSelector({ value, onChange }: PaymentScheduleSelectorProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="tpl-lbl">{LABEL_PAYMENT_SCHEDULE}</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`tpl-chip${value === option.value ? " tpl-on" : ""}`}
            style={{ cursor: "pointer" }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
