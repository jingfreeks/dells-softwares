import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "@/pages/authTheme.css";
import "@/pages/Landing/landingTheme.css";

const CONTACT_EMAIL = "dobluis.lyndell@gmail.com";
const LAST_UPDATED = "August 28, 2026";

export function Privacy() {
  return (
    <div className="tpl-root tland-root">
      <div className="tland-wrap" style={{ maxWidth: 760, padding: "clamp(32px,6vw,64px) 24px" }}>
        <Link to="/" className="tland-microcopy" style={{ display: "inline-block", marginBottom: 24 }}>
          &larr; Back to home
        </Link>
        <h1 style={{ marginBottom: 8 }}>Privacy Notice</h1>
        <p className="tland-microcopy" style={{ marginBottom: 32 }}>Last updated {LAST_UPDATED}</p>

        <p className="tland-lede" style={{ maxWidth: "none", marginBottom: 32 }}>
          Dells Software ("we," "us") builds Tindahan POS. This notice explains what personal information we
          collect through this website and the Tindahan POS application, why, and what choices you have. It's
          written to reflect what the product actually does today, not a generic template &mdash; if something
          here doesn't match your experience of the product, please tell us.
        </p>

        <Section title="What we collect">
          <p>Depending on how you use the site and app, we collect:</p>
          <ul>
            <li>
              <b>Demo requests</b> &mdash; your name, business name, mobile number, business type, number of
              locations, and (optional) email and message, when you fill out the "Book a demo" form.
            </li>
            <li>
              <b>Account information</b> &mdash; your name, email address, and a securely hashed password when you
              register a store, plus any store details you add (store name, address, contact number, tax
              information).
            </li>
            <li>
              <b>Business data you enter</b> &mdash; products, sales, customer records (including utang balances),
              staff accounts, and reports, all of which stay tied to your store and are not visible to other
              stores.
            </li>
          </ul>
        </Section>

        <Section title="How we use it">
          <ul>
            <li>To respond to demo requests and set up your account.</li>
            <li>To operate the product &mdash; running your point-of-sale, inventory, customer and reporting
              features.</li>
            <li>
              To process e-load, cash-in and cash-out transactions you initiate, which may require sharing limited
              transaction details with the relevant payment or e-load service provider.
            </li>
            <li>To respond if you contact us for support.</li>
          </ul>
          <p>
            We do not sell your information, and we do not currently use third-party analytics or advertising
            trackers on this site.
          </p>
        </Section>

        <Section title="Where it's stored">
          <p>
            Your data is hosted on Supabase's infrastructure, which encrypts data in transit and at rest. Access
            within the app is role-based &mdash; a cashier account can only see what their role needs, and every
            store's data is isolated from every other store's.
          </p>
        </Section>

        <Section title="Your choices">
          <ul>
            <li>
              <b>Export</b> &mdash; you can export your sales, products, and customer records as a spreadsheet at
              any time from Settings.
            </li>
            <li>
              <b>Delete your account</b> &mdash; you can request account deletion from within the app. If you're
              the only admin on your store, you'll be asked to promote another staff member to admin first, so the
              store isn't left without anyone able to manage it.
            </li>
            <li>
              <b>Demo request follow-up</b> &mdash; if you'd rather we not contact you about a demo request you
              submitted, let us know at the email below and we'll stop.
            </li>
          </ul>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this notice or your data can go to{" "}
            <a className="tland-btn-s" href={`mailto:${CONTACT_EMAIL}`} style={{ display: "inline", padding: 0, height: "auto", background: "none", border: "none", color: "var(--tpl-a5)", textDecoration: "underline" }}>
              {CONTACT_EMAIL}
            </a>
            . This is a temporary contact address while we finish setting up a dedicated domain.
          </p>
        </Section>

        <p className="tland-microcopy" style={{ marginTop: 40 }}>
          This notice is a work in progress as the product grows, and hasn't yet been reviewed by legal counsel
          &mdash; treat it as a good-faith description of current practice rather than a final legal document.
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
