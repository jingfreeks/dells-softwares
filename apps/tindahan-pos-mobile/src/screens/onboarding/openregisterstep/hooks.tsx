import { computeCashHealth, computeStartingFloat } from "../../../lib/onboarding";
import type { OpenRegisterStepProps } from "./types";

export const DEFAULT_DRAWER_MINIMUM = 500;

/** Derived data for OpenRegisterStep -- OpenRegisterStep.tsx stays presentational. */
export function useOpenRegisterStep({ denominationCounts }: Pick<OpenRegisterStepProps, "denominationCounts">) {
  const startingFloat = computeStartingFloat(denominationCounts);
  const cashHealth = computeCashHealth(denominationCounts);
  return { startingFloat, cashHealth };
}
