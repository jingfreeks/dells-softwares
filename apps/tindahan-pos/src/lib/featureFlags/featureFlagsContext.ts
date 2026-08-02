import { createContext, useContext } from "react";

export interface FeatureFlagsContextValue {
  isEnabled: (key: string) => boolean;
  loading: boolean;
}

export const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

/**
 * Fail-open: a key with no entry is treated as enabled. You only ever
 * need to add a row (or an entry here) to turn something OFF.
 */
export function resolveFlag(flags: Map<string, boolean>, key: string): boolean {
  return flags.get(key) ?? true;
}

function useFeatureFlagsContext() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error("useFeatureFlag must be used within FeatureFlagsProvider");
  return ctx;
}

/** Returns whether the given feature flag is enabled (fail-open if unset). */
export function useFeatureFlag(key: string): boolean {
  return useFeatureFlagsContext().isEnabled(key);
}
