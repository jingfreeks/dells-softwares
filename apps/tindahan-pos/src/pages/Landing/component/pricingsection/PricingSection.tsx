import { Link } from "react-router-dom";
import { STATIC_PLANS } from "@/lib/plan/staticPlans";
import { PESO_WHOLE as PESO } from "@/lib/money";
import { PricingCard } from "./component/pricingcard";
import { usePricingSection } from "./hooks";

// Annual price = 10 months' worth (2 months free) -- a marketing-page-only
// display computation. No checkout flow exists yet (BUSINESS/PRO are sold
// by a human per request_plan_upgrade.sql), so there's no real "ANNUAL"
// billingInterval in STATIC_PLANS/core.subscription_plans to read instead.
// The bullets below describe what core.plan_features ACTUALLY grants, not a
// separate marketing story. They drifted apart once (#457): the page sold
// utang, e-load and shifts as the Starter -> Growth upgrade while all three
// were already granted to Starter, so the entire upgrade case was for
// something the customer already had, and Starter's advertised product cap
// was 200 against a real 5,000.
//
// supabase/tests/250_tier_split.sql pins the grants per tier and is the thing
// to read before editing a bullet here -- "BASIC is the sari-sari store" and
// "BUSINESS is the growing store: purchase orders, stock counts and unit
// conversions on top of BASIC" are that suite's own words. If a claim here
// cannot be traced to a feature code in that test, it does not belong on the
// page.
//
// Two bullets were removed rather than reworded: "1 user" and "up to 5 staff".
// There is no staff or user limit in the system -- the only limit keys are
// branches, devices, products and warehouses -- so both were unenforceable as
// written.
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
            description="For one shop running its counter on paper today. Enough to stop using the notebook."
            features={[
              "Utang tracking with ageing",
              "E-load, cash-in and cash-out",
              "Cashier PINs, shifts and drawer counts",
              "Receiving, suppliers and pack pricing",
              "Up to 5,000 products across 3 devices",
            ]}
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
            description="For stores that need to manage stock, not only sell it."
            features={[
              `Everything in ${starter.name}`,
              "Purchase orders",
              "Stock counts",
              "Unit conversions — buy by the sack, sell by the kilo",
              "Unlimited products, devices and branches",
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
            description="For more than one location, or requirements the other tiers do not cover."
            features={[
              `Everything in ${growth.name}`,
              "Multiple registers per branch",
              "Stock transfers between branches",
              "BIR receipting",
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
