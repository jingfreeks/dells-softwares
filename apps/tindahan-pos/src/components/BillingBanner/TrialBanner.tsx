interface TrialBannerProps {
  /** Whole days left, from daysUntil(billing.trialEndsAt) -- see trialCountdown.ts. */
  daysRemaining: number;
  onUpgradeClick: () => void;
}

/**
 * The TRIALING state of BillingBanner, split out because it has three
 * visually distinct severities as the deadline nears (approved design
 * screens 48/49/50). One component, driven entirely by `daysRemaining` --
 * not three separate day-count components.
 */
export function TrialBanner({ daysRemaining, onUpgradeClick }: TrialBannerProps) {
  const severity = daysRemaining <= 1 ? "urgent" : daysRemaining <= 3 ? "warning" : "info";

  const classesBySeverity = {
    info: "border-amber-200 bg-amber-50 text-amber-900",
    warning: "border-amber-300 bg-amber-100 text-amber-950",
    urgent: "border-red-300 bg-red-50 text-red-900",
  } as const;

  const dayLabel =
    daysRemaining <= 0
      ? "today"
      : daysRemaining === 1
        ? "1 day"
        : `${daysRemaining} days`;

  return (
    <div
      role="status"
      className={`flex flex-col items-start gap-2 border-b px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${classesBySeverity[severity]}`}
    >
      <span>
        <span className="font-medium">
          {severity === "urgent" ? "Your free trial ends " : "You're on a free trial. "}
        </span>
        {severity === "urgent"
          ? `${dayLabel === "today" ? "today" : `in ${dayLabel}`}.`
          : `${dayLabel} left. `}
        After that you'll move back to Basic — everything you've recorded stays exactly where it is.
      </span>
      <button
        type="button"
        onClick={onUpgradeClick}
        className="w-full shrink-0 rounded-md border border-current px-3 py-1 font-medium hover:bg-white/40 sm:w-auto"
      >
        Choose a plan
      </button>
    </div>
  );
}
