import { usePricingPage } from "./hooks";
import { PlanCard } from "./component/PlanCard";
import "@/pages/authTheme.css";

const TRIALABLE_CODES = new Set(["BUSINESS", "PRO"]);

/** Upgrade/Pricing (approved design screen 52). */
export function Pricing() {
  const { loading, plans, currentPlanCode, hasUsedTrial, startedCode, choosePlan } = usePricingPage();

  return (
    <div className="tpl-root min-h-screen" style={{ background: "#0B142A", padding: "48px 24px" }}>
      <div className="mx-auto max-w-4xl">
        <p style={{ color: "var(--tpl-t1)", fontSize: 28, fontWeight: 500, marginBottom: 8 }}>
          Choose a plan
        </p>
        <p className="tpl-ts" style={{ marginBottom: 28 }}>
          Everything you've recorded stays exactly where it is, whatever you pick.
        </p>

        {loading && <p className="tpl-ts">Loading plans…</p>}

        {!loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.planCode}
                name={plan.name}
                priceLabel={plan.priceLabel}
                featureCount={plan.features.size}
                isCurrent={plan.planCode === currentPlanCode}
                canStartTrial={TRIALABLE_CODES.has(plan.planCode) && !hasUsedTrial}
                justStarted={startedCode === plan.planCode}
                onChoose={() => choosePlan(plan.planCode)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
