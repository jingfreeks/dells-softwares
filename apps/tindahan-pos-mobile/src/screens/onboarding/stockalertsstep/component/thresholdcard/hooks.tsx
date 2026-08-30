import { MAX_THRESHOLD_DAYS, MIN_THRESHOLD_DAYS } from "../../../../../lib/onboarding";
import type { ThresholdCardProps } from "./types";

/** Derived range/percent for ThresholdCard -- ThresholdCard.tsx stays presentational. */
export function useThresholdCard({ thresholdDays }: ThresholdCardProps) {
  const range = MAX_THRESHOLD_DAYS - MIN_THRESHOLD_DAYS;
  const percent = ((thresholdDays - MIN_THRESHOLD_DAYS) / range) * 100;
  const days = Array.from({ length: range + 1 }, (_, i) => MIN_THRESHOLD_DAYS + i);
  return { percent, days };
}
