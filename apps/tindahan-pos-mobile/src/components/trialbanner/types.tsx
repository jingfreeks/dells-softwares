export interface TrialBannerProps {
  /** Whole days left, from daysUntil(billing.trialEndsAt) -- see trialCountdown.ts. */
  daysRemaining: number;
  onViewPlansPress: () => void;
}

export type TrialSeverity = "plenty" | "info" | "warning" | "urgent";
