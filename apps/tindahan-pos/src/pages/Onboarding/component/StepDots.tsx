import { LABEL_STEP_YOUR_PROFILE, LABEL_STEP_YOUR_STORE } from "@/lib";
import type { OnboardingStep } from "../hooks";

const STEP_LABELS: { key: OnboardingStep; label: string }[] = [
  { key: "profile", label: LABEL_STEP_YOUR_PROFILE },
  { key: "store", label: LABEL_STEP_YOUR_STORE },
];

export function StepDots({ current }: { current: OnboardingStep }) {
  if (current === "welcome" || current === "congrats") return null;
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {STEP_LABELS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              s.key === current
                ? "bg-[var(--color-brand)] text-white"
                : STEP_LABELS.findIndex((x) => x.key === current) > i
                  ? "bg-[var(--color-brand)]/20 text-[var(--color-brand)]"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {i + 1}
          </div>
          <span className={`text-xs font-medium ${s.key === current ? "text-slate-800" : "text-slate-400"}`}>
            {s.label}
          </span>
          {i < STEP_LABELS.length - 1 && <div className="h-px w-6 bg-slate-200" />}
        </div>
      ))}
    </div>
  );
}
