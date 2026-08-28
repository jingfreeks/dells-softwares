import { colors } from "../../theme/colors";
import type { TrialSeverity } from "./types";

/**
 * Four severities, matching the approved mobile mockups (27 general/green,
 * 31 seven-day/blue, 32 three-day/amber, 33 one-day/red) -- one
 * state-driven component rather than four, same anti-duplication rule
 * already applied on web (see TrialBanner's own doc comment there).
 */
export function severityForDaysRemaining(daysRemaining: number): TrialSeverity {
  if (daysRemaining > 7) return "plenty";
  if (daysRemaining > 3) return "info";
  if (daysRemaining > 1) return "warning";
  return "urgent";
}

const BACKGROUND: Record<TrialSeverity, string> = {
  plenty: "rgba(74,222,128,0.08)",
  info: "rgba(59,130,246,0.10)",
  warning: "rgba(251,191,36,0.10)",
  urgent: "rgba(248,113,113,0.10)",
};

const BORDER: Record<TrialSeverity, string> = {
  plenty: "rgba(74,222,128,0.24)",
  info: "rgba(59,130,246,0.28)",
  warning: "rgba(251,191,36,0.30)",
  urgent: "rgba(248,113,113,0.30)",
};

const TEXT_COLOR: Record<TrialSeverity, string> = {
  plenty: colors.successDim,
  info: colors.accentSoft,
  warning: colors.warningDim,
  urgent: colors.errorDim,
};

/** Derives the severity-driven colors for TrialBanner -- TrialBanner.tsx stays presentational. */
export function useTrialBanner(daysRemaining: number) {
  const severity = severityForDaysRemaining(daysRemaining);
  return {
    severity,
    background: BACKGROUND[severity],
    border: BORDER[severity],
    textColor: TEXT_COLOR[severity],
  };
}
