import { DemoForm } from "./component/demoform";
import { DemoStep } from "./component/demostep";

export function DemoSection() {
  return (
    <section className="tland-section tland-demo" id="demo" style={{ borderTop: "0.5px solid var(--tpl-bd3)" }}>
      <div className="tland-wrap">
        <div className="tland-demogrid">
          <div>
            <p className="tland-kicker">Book a demo</p>
            <h2 style={{ marginBottom: 14 }}>Fifteen minutes, your actual products.</h2>
            <p className="tland-lede">
              We&rsquo;ll load a handful of the things you really sell, ring up a sale, and show you the closing
              report. If it isn&rsquo;t a fit we&rsquo;ll say so.
            </p>
            <div className="tland-sold">
              <DemoStep
                number={1}
                title="Tell us about your shop"
                description="What you sell, how many people work the counter, whether you offer utang or e-load."
              />
              <DemoStep
                number={2}
                title="We call or message you"
                description="Usually within one working day. Video call, or we can visit if you're in Metro Manila."
              />
              <DemoStep
                number={3}
                title="You decide, with no pressure"
                description="If you want to try it, we help you import your products and open the register."
              />
            </div>
          </div>
          <DemoForm />
        </div>
      </div>
    </section>
  );
}
