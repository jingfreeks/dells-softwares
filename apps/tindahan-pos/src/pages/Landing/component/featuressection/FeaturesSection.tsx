import { PosIcon, InventoryIcon, CreditCardIcon, WalletIcon, StaffIcon, ReportsIcon } from "@/components/icons";
import { FeatureCard } from "./component/featurecard";

export function FeaturesSection() {
  return (
    <section className="tland-section" id="features" style={{ borderTop: "0.5px solid var(--tpl-bd3)" }}>
      <div className="tland-wrap">
        <div className="tland-shead">
          <p className="tland-kicker">What you get</p>
          <h2>Everything the counter needs, nothing it doesn&rsquo;t.</h2>
          <p className="tland-lede">
            Six things, built around how a small shop actually trades — cash, credit, and services on the side.
          </p>
        </div>
        <div className="tland-grid3">
          <FeatureCard
            icon={<PosIcon />}
            title="Fast checkout"
            description="Tap a product tile or scan a barcode. Quick-cash buttons work out the change for you, so the queue keeps moving."
          />
          <FeatureCard
            icon={<InventoryIcon />}
            title="Stock that warns you early"
            description="Alerts based on how fast each item actually sells, not a flat number. Know what's running low before the shelf is empty."
          />
          <FeatureCard
            icon={<CreditCardIcon />}
            title="Utang, properly tracked"
            description="Credit limits you can actually enforce, and balances that show their age — so you know exactly who to follow up with, and when."
          />
          <FeatureCard
            icon={<WalletIcon />}
            title="E-load and e-wallet"
            description="Load, cash-in and cash-out with the service fee applied automatically from your own rate table. No more fees typed from memory."
          />
          <FeatureCard
            icon={<StaffIcon />}
            title="Staff you can trust the till with"
            description="Each person signs in with a PIN. Sales are attributed, and every cashier sees only their own shift."
          />
          <FeatureCard
            icon={<ReportsIcon />}
            title="Reports you'll actually read"
            description="One morning summary: what sold, what's running out, what you're owed. Print it, share it, or export it — it's there either way."
          />
        </div>
      </div>
    </section>
  );
}
