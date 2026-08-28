import "@/pages/authTheme.css";
import "./landingTheme.css";
import {
  Navbar,
  HeroSection,
  TrustBar,
  ProblemSection,
  FeaturesSection,
  HardwareSection,
  ShowcaseSection,
  PricingSection,
  DemoSection,
  FaqSection,
  ClosingCta,
  Footer,
} from "./component";
import { useDocumentHead } from "./hooks";

const HARDWARE_TRUST_ITEMS = [
  <>
    <b>Works offline.</b> Keeps selling when the internet drops.
  </>,
  <>
    <b>Runs on a cheap tablet.</b> No special hardware.
  </>,
  <>
    <b>Set up in an afternoon.</b> Import your products, open the register.
  </>,
];

const RELIABILITY_TRUST_ITEMS = [
  <>
    <b>Role-based access.</b> Cashiers see only their own shift, not your reports.
  </>,
  <>
    <b>Every transaction recorded.</b> Nothing gets edited away quietly.
  </>,
  <>
    <b>Backed up automatically.</b> Export your data anytime — you&rsquo;re not locked in.
  </>,
];

export function Landing() {
  useDocumentHead(
    "Tindahan POS by Dells Software — know your sales, stock and utang",
    "Run your tindahan with confidence. Sales, stock, utang, cashiers and reports in one simple system — no expensive POS machine required. Use the laptop or tablet you already have."
  );

  return (
    <div className="tpl-root tland-root">
      <Navbar />
      <main id="top">
        <HeroSection />
        <TrustBar items={HARDWARE_TRUST_ITEMS} />
        <ProblemSection />
        <FeaturesSection />
        <HardwareSection />
        <ShowcaseSection />
        <PricingSection />
        <TrustBar items={RELIABILITY_TRUST_ITEMS} />
        <DemoSection />
        <FaqSection />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
