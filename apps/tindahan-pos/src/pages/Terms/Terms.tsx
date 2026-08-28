import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "@/pages/authTheme.css";
import "@/pages/Landing/landingTheme.css";

const CONTACT_EMAIL = "dobluis.lyndell@gmail.com";
const LAST_UPDATED = "August 28, 2026";

export function Terms() {
  return (
    <div className="tpl-root tland-root">
      <div className="tland-wrap" style={{ maxWidth: 760, padding: "clamp(32px,6vw,64px) 24px" }}>
        <Link to="/" className="tland-microcopy" style={{ display: "inline-block", marginBottom: 24 }}>
          &larr; Back to home
        </Link>
        <h1 style={{ marginBottom: 8 }}>Terms of Service</h1>
        <p className="tland-microcopy" style={{ marginBottom: 32 }}>Last updated {LAST_UPDATED}</p>

        <p className="tland-lede" style={{ maxWidth: "none", marginBottom: 32 }}>
          These terms cover your use of Tindahan POS, provided by Dells Software ("we," "us"). By creating an
          account or using the app, you agree to them. This is written to reflect what the product actually does
          today, not boilerplate &mdash; if something here doesn't match your experience of the product, please
          tell us.
        </p>

        <Section title="The service">
          <p>
            Tindahan POS is a point-of-sale and store-management application: sales, inventory, customer/utang
            tracking, staff accounts, e-load and e-wallet services, and reporting, built for small Filipino
            retailers. It runs in your browser on a laptop or tablet you already own.
          </p>
        </Section>

        <Section title="Your account">
          <ul>
            <li>You're responsible for keeping your login credentials, and any staff PINs you issue, confidential.</li>
            <li>
              You're responsible for the accuracy of the business data you enter &mdash; products, prices, sales,
              and customer records.
            </li>
            <li>
              If you're the only admin on a store, you'll need to promote another staff member to admin before you
              can delete your own account, so the store isn't left without anyone able to manage it.
            </li>
          </ul>
        </Section>

        <Section title="Acceptable use">
          <p>Don't use Tindahan POS to:</p>
          <ul>
            <li>Break any applicable law, including tax and consumer-protection law.</li>
            <li>Attempt to access another store's data, or circumvent the app's access controls.</li>
            <li>Interfere with the service's operation or attempt to overload it.</li>
          </ul>
        </Section>

        <Section title="Pricing and billing">
          <p>
            Current pricing is shown on our{" "}
            <Link to="/#pricing" className="tland-btn-s" style={{ display: "inline", padding: 0, height: "auto", background: "none", border: "none", color: "var(--tpl-a5)", textDecoration: "underline" }}>
              pricing page
            </Link>{" "}
            and is indicative pending launch &mdash; we'll tell you before any change affects your account. Higher
            tiers (Growth and above) are currently arranged directly with us rather than through an automated
            checkout; we'll always confirm price and terms with you before billing starts.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You can stop using the service and delete your account at any time from Settings. We may suspend or
            terminate access for accounts that violate these terms, with notice where practical.
          </p>
        </Section>

        <Section title="Disclaimers">
          <p>
            Tindahan POS is provided "as is." We work to keep it reliable, but we don't guarantee it will be
            uninterrupted or error-free. You're responsible for your own business decisions, including pricing,
            credit (utang) extended to customers, and tax compliance &mdash; the app is a tool to help you track
            these, not a substitute for your own judgment or professional advice.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms as the product changes. We'll update the date at the top of this page when
            we do; continued use after a change means you accept the update.
          </p>
        </Section>

        <Section title="Governing law">
          <p>These terms are governed by the laws of the Republic of the Philippines.</p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms can go to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              style={{ display: "inline", color: "var(--tpl-a5)", textDecoration: "underline" }}
            >
              {CONTACT_EMAIL}
            </a>
            . This is a temporary contact address while we finish setting up a dedicated domain.
          </p>
        </Section>

        <p className="tland-microcopy" style={{ marginTop: 40 }}>
          These terms are a work in progress as the product grows, and haven't yet been reviewed by legal counsel
          &mdash; treat them as a good-faith description of current practice rather than a final legal document.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>{title}</h2>
      <div className="tland-privacy-body">{children}</div>
    </section>
  );
}
