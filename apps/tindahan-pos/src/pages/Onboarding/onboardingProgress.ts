import type { OnboardingStep } from "./hooks";

const STORAGE_KEY_PREFIX = "tindahan-pos:onboarding-progress:";

/**
 * Lets a signed-in admin leave the wizard mid-flow and resume at the same
 * step on their next visit, instead of restarting from "welcome" — there's
 * no backend column for "current onboarding step" yet, so this is
 * client-side only. Cleared once onboarding actually completes.
 */
export function loadOnboardingStep(storeId: string): OnboardingStep | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    return (raw as OnboardingStep | null) ?? null;
  } catch {
    return null;
  }
}

export function saveOnboardingStep(storeId: string, step: OnboardingStep): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + storeId, step);
  } catch {
    // Best-effort persistence — ignore quota/availability errors.
  }
}

export function clearOnboardingStep(storeId: string): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY_PREFIX + storeId);
  } catch {
    // Best-effort persistence — ignore quota/availability errors.
  }
}
