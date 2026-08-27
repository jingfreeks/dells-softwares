import { onboardingMinutesLeft, onboardingProgressPercent } from "../../../lib/onboarding";
import type { OnboardingStepHeaderProps } from "./types";

/** Derived progress data for OnboardingStepHeader -- OnboardingStepHeader.tsx stays presentational. */
export function useOnboardingStepHeader({ step }: Pick<OnboardingStepHeaderProps, "step">) {
  const percent = onboardingProgressPercent(step);
  const minutesLeft = onboardingMinutesLeft(step);
  return { percent, minutesLeft };
}
