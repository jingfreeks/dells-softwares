import { FooterColumn } from "./component/footercolumn";

export function Footer() {
  return (
    <footer className="tland-footer">
      <div className="tland-wrap">
        <div className="tland-fgrid">
          <div>
            <a className="tland-brand" href="#top" style={{ marginBottom: 12, display: "inline-flex" }} aria-label="Dells Software home">
              <img className="tland-logo" src="/dells-softwares-logo-reverse.png" alt="Dells Software" />
            </a>
            <p style={{ fontSize: 14, color: "var(--tpl-t6)", maxWidth: "34ch" }}>
              Business systems built for growing Filipino businesses.
            </p>
          </div>
          <FooterColumn
            title="Product"
            links={[
              { label: "Tindahan POS", href: "#top" },
              { label: "Inventory", href: "#features" },
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[{ label: "About" }, { label: "Contact", href: "#demo" }, { label: "Support", href: "#demo" }]}
          />
          <FooterColumn
            title="Resources"
            links={[
              { label: "Help", href: "#demo" },
              { label: "FAQ", href: "#faq" },
              { label: "Documentation" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms" },
            ]}
          />
        </div>
        <div className="tland-fbot">
          <p>&copy; 2026 Dells Software. Tindahan POS &middot; Made in the Philippines.</p>
          <p>dobluis.lyndell@gmail.com &middot; 0991 214 1979 / 0921 233 7636</p>
        </div>
      </div>
    </footer>
  );
}
