import { useMemo } from "react";
import { useFeatures, type StoreFeature } from "@/lib/features/featuresContext";
import { useBillingState } from "@/lib/billing/billingContext";
import {
  MODULE_LABEL_POS,
  MODULE_LABEL_INVENTORY,
  MODULE_LABEL_ACCOUNTING,
} from "@/lib";

const MODULE_LABELS: Record<string, string> = {
  POS: MODULE_LABEL_POS,
  INVENTORY: MODULE_LABEL_INVENTORY,
  ACCOUNTING: MODULE_LABEL_ACCOUNTING,
};

export interface PlanGroup {
  moduleCode: string;
  label: string;
  features: StoreFeature[];
}

/**
 * The store's capabilities, split into what it holds and what it does not.
 *
 * Grouped by module because that is how the catalogue is organised and how an
 * upgrade is actually sold — "you have Selling, you do not have Stock and
 * suppliers" is a sentence a shopkeeper can act on, where a flat list of
 * fifteen codes is not.
 *
 * A module with nothing to show is dropped rather than rendered empty.
 */
export function usePlanPage() {
  const { catalogue, loading } = useFeatures();
  const billing = useBillingState();

  const { held, locked } = useMemo(() => {
    const group = (rows: StoreFeature[]): PlanGroup[] => {
      const byModule = new Map<string, StoreFeature[]>();
      for (const f of rows) {
        const list = byModule.get(f.moduleCode);
        if (list) list.push(f);
        else byModule.set(f.moduleCode, [f]);
      }
      return [...byModule.entries()].map(([moduleCode, features]) => ({
        moduleCode,
        label: MODULE_LABELS[moduleCode] ?? moduleCode,
        features,
      }));
    };

    return {
      held: group(catalogue.filter((f) => f.held)),
      locked: group(catalogue.filter((f) => !f.held)),
    };
  }, [catalogue]);

  return {
    loading,
    held,
    locked,
    /** Nothing is withheld — say so plainly rather than showing an empty panel. */
    holdsEverything: !loading && catalogue.length > 0 && locked.length === 0,
    /** §08: writes can be paused, but nothing is ever taken away or hidden. */
    writesPaused: billing ? !billing.writesAllowed : false,
  };
}
