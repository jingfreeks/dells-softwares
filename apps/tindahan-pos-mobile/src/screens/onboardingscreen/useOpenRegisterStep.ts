import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../lib/auth";
import { computeStartingFloat, type DenominationCounts } from "../../lib/onboarding";
import { loadDenominationCounts, saveDenominationCounts } from "../../lib/onboardingSettings";

/**
 * The onboarding wizard's open-register step -- the denomination count the
 * shop starts its drawer with.
 *
 * Mirrors the web app's Onboarding/useOpenRegisterStep.ts. Same async-load
 * caveat as useStockAlertsStep: the save effect waits for the load, or the
 * first render would persist an empty count over whatever was saved.
 */
export function useOpenRegisterStep() {
  const { user } = useAuth();

  const [denominationCounts, setDenominationCounts] = useState<DenominationCounts>({});
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    loadDenominationCounts(user.storeId).then((saved) => {
      setDenominationCounts(saved);
      loadedRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => {
    if (!user || !loadedRef.current) return;
    saveDenominationCounts(user.storeId, denominationCounts);
  }, [user, denominationCounts]);

  const startingFloat = useMemo(() => computeStartingFloat(denominationCounts), [denominationCounts]);

  return { denominationCounts, setDenominationCounts, startingFloat };
}
