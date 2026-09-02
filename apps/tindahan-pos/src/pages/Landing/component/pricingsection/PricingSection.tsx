import { Link } from "react-router-dom";
import { STATIC_PLANS } from "@/lib/plan/staticPlans";
import { PESO_WHOLE as PESO } from "@/lib/money";
import { PricingCard } from "./component/pricingcard";
import { usePricingSection } from "./hooks";

// Annual price = 10 months' worth (2 months free) -- a marketing-page-only
// display computation. No checkout flow exists yet (BUSINESS/PRO are sold
// by a human per request_plan_upgrade.sql), so there's no real "ANNUAL"
// billingInterval in STATIC_PLANS/core.subscription_plans to read instead.
const ANNUAL_MONTHS = 10;
const SAVE_PERCENT = Math.round((1 - ANNUAL_MONTHS / 12) * 100);

const starter = STATIC_PLANS.find((p) => p.code === "BASIC")!;
const growth = STATIC_PLANS.find((p) => p.code === "BUSINESS")!;
const business = STATIC_PLANS.find((p) => p.code === "ENTERPRISE")!;

export function PricingSection() {
  const { interval, setInterval } = usePricingSection();
  const annual = interval === "ANNUAL";

  return (
    <section className="tland-section" id="pricing" style={{ borderTop: "0.5px solid var(--tpl-bd3)" }}>
      <div className="tland-wrap">
        <div className="tland-shead">
          <p className="tland-kicker">Pricing</p>
          <h2>Priced for a shop, not an enterprise.</h2>
          <p className="tland-lede">
            One store, one price. No setup fee, no lock-in, and you can export everything you&rsquo;ve entered at
            any time.
          </p>
        </div>

        <div className="tland-pricetoggle" role="group" aria-label="Billing interval">
          <button type="button" aria-pressed={!annual} onClick={() => setInterval("MONTHLY")}>
            Monthly
          </button>
          <button type="button" aria-pressed={annual} onClick={() => setInterval("ANNUAL")}>
            Annual
          </button>
          {annual && <span className="tland-save">Save {SAVE_PERCENT}%</span>}
        </div>

        <div className="tland-pricegrid">
          <PricingCard
            name={starter.name}
            amount={
              annual ? (
                <>
                  {PESO.format(starter.pricePhp! * ANNUAL_MONTHS)}
                  <small> / year</small>
                </>
              ) : (
                <>
                  {PESO.format(starter.pricePhp!)}
                  <small> / month</small>
                </>
              )
            }
            description="For small stores starting digital. Enough to stop using the notebook."
            features={["Up to 200 products", "Sales and daily summary", "Basic stock alerts", "1 user"]}
            cta={
              <Link className="tland-btn tland-btn-s" to="/register">
                Get started
              </Link>
            }
          />
          <PricingCard
            name={growth.name}
            tag="Most shops pick this"
            featured
            amount={
              annual ? (
                <>
                  {PESO.format(growth.pricePhp! * ANNUAL_MONTHS)}
                  <small> / year</small>
                </>
              ) : (
                <>
                  {PESO.format(growth.pricePhp!)}
                  <small> / month</small>
                </>
              )
            }
            description="For stores with more products, transactions and staff."
            features={[
              "Unlimited products",
              "Utang tracking with ageing",
              "E-load, cash-in and cash-out",
              "Up to 5 staff with PINs and shifts",
              "Drawer counts and variance alerts",
            ]}
            cta={
              <Link className="tland-btn tland-btn-p" to="/register?plan=BUSINESS">
                Get started
              </Link>
            }
          />
          <PricingCard
            name={business.name}
            amount="Let's Talk"
            description="For businesses that need customized solutions — more than one location, or unusual requirements."
            features={[
              `Everything in ${growth.name}`,
              "Per-branch registers and reporting",
              "Consolidated view across stores",
              "Help migrating your existing data",
            ]}
            cta={
              <a className="tland-btn tland-btn-s" href="#demo">
                Talk to us
              </a>
            }
          />
        </div>
        <p style={{ fontSize: 13, color: "var(--tpl-t8)", marginTop: 22 }}>
          Prices shown in Philippine pesos and are indicative pending launch. VAT treatment depends on your
          registration — please check with your accountant.
        </p>
      </div>
    </section>
  );
}
