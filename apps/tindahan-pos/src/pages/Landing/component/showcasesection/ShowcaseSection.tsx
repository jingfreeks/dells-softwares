import { CheckoutPanel } from "./component/checkoutpanel";
import { RestockingPanel } from "./component/restockingpanel";
import { UtangPanel } from "./component/utangpanel";

export function ShowcaseSection() {
  return (
    <section className="tland-section" id="how" style={{ borderTop: "0.5px solid var(--tpl-bd3)" }}>
      <div className="tland-wrap">
        <div className="tland-shead">
          <p className="tland-kicker">How it works</p>
          <h2>Built around the counter, not the spreadsheet.</h2>
          <p className="tland-lede">
            Track your daily benta, see which paninda needs restocking, and know who still has utang — all from the
            same screen you use to ring up a sale.
          </p>
        </div>

        <div className="tland-show">
          <div className="tland-showtext">
            <h2 style={{ fontSize: "clamp(22px,2.8vw,28px)", marginBottom: 12 }}>Ring it up in two taps</h2>
            <p style={{ fontSize: 15.5, color: "var(--tpl-t5)" }}>
              Most of what a small shop sells is small, cheap, and has no barcode. So the register leads with a grid
              you tap, and keeps scanning as the backup.
            </p>
            <ul>
              <li>
                <span className="tland-tick">&#10003;</span>
                <span>Product tiles sorted by what sells, with stock warnings on the tile itself</span>
              </li>
              <li>
                <span className="tland-tick">&#10003;</span>
                <span>Quick-cash buttons and automatic change, shown large enough to read aloud</span>
              </li>
              <li>
                <span className="tland-tick">&#10003;</span>
                <span>Cash, GCash or utang on the same screen, in the same cart</span>
              </li>
            </ul>
          </div>
          <CheckoutPanel />
        </div>

        <div className="tland-show tland-flip">
          <div className="tland-showtext">
            <h2 style={{ fontSize: "clamp(22px,2.8vw,28px)", marginBottom: 12 }}>
              Know what to reorder before it&rsquo;s gone
            </h2>
            <p style={{ fontSize: 15.5, color: "var(--tpl-t5)" }}>
              A count of low items tells you nothing. Tindahan works out how fast each thing sells and tells you
              when it runs out — and how much to buy.
            </p>
            <ul>
              <li>
                <span className="tland-tick">&#10003;</span>
                <span>Sorted by what runs out soonest, not alphabetically</span>
              </li>
              <li>
                <span className="tland-tick">&#10003;</span>
                <span>Suggested order quantity based on your own sales rate</span>
              </li>
              <li>
                <span className="tland-tick">&#10003;</span>
                <span>Margin per product, so you know what&rsquo;s actually worth restocking</span>
              </li>
            </ul>
          </div>
          <RestockingPanel />
        </div>

        <div className="tland-show">
          <div className="tland-showtext">
            <h2 style={{ fontSize: "clamp(22px,2.8vw,28px)", marginBottom: 12 }}>
              See who owes you, and for how long
            </h2>
            <p style={{ fontSize: 15.5, color: "var(--tpl-t5)" }}>
              Utang without an age is just a number. Every balance carries how old it is, so you know who to chase
              first — usually right after sahod.
            </p>
            <ul>
              <li>
                <span className="tland-tick">&#10003;</span>
                <span>Credit limits the register can actually enforce, with your PIN to override</span>
              </li>
              <li>
                <span className="tland-tick">&#10003;</span>
                <span>Ageing buckets so you can see how much capital is stuck</span>
              </li>
              <li>
                <span className="tland-tick">&#10003;</span>
                <span>See exactly who&rsquo;s over 30 days, so you know who to follow up with first</span>
              </li>
            </ul>
          </div>
          <UtangPanel />
        </div>
      </div>
    </section>
  );
}
