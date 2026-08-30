import { InventoryIcon, LaptopIcon, StoreIcon } from "@/components/icons";
import { HardwareStep } from "./component/hardwarestep";

export function HardwareSection() {
  return (
    <section
      className="tland-section"
      style={{
        borderTop: "0.5px solid var(--tpl-bd3)",
        background: "radial-gradient(60% 100% at 50% 0%, rgba(74,222,128,.07), transparent 70%)",
      }}
    >
      <div className="tland-wrap">
        <div className="tland-show">
          <div className="tland-showtext">
            <p className="tland-kicker">The biggest difference</p>
            <h2>Your store doesn&rsquo;t need expensive hardware.</h2>
            <p className="tland-lede" style={{ marginBottom: 0 }}>
              If you already have a laptop or tablet, you already have what you need to get started. No
              proprietary terminal, no card reader tied to one supplier, no five-figure upfront cost before
              you&rsquo;ve made a single sale.
            </p>
            <ul>
              <li>
                <span className="tland-tick">&#10003;</span>Works on any recent Android tablet, laptop, or desktop
                browser
              </li>
              <li>
                <span className="tland-tick">&#10003;</span>Add a barcode scanner or receipt printer later, only if
                you want one
              </li>
              <li>
                <span className="tland-tick">&#10003;</span>One-time setup, no special IT visit required
              </li>
            </ul>
          </div>
          <div className="tland-panel">
            <div className="tland-hwflow">
              <HardwareStep icon={<LaptopIcon />} title="Laptop or tablet" subtitle="what you already own" />
              <span className="tland-hwarrow">&rarr;</span>
              <HardwareStep icon={<InventoryIcon />} title="Tindahan POS" subtitle="the system" highlighted />
              <span className="tland-hwarrow">&rarr;</span>
              <HardwareStep
                icon={
                  <span style={{ color: "var(--tpl-ok)" }}>
                    <StoreIcon />
                  </span>
                }
                title="Your store"
                subtitle="running with confidence"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
