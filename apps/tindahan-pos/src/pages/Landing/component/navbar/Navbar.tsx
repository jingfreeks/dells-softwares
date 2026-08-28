import { Link } from "react-router-dom";
import { MenuIcon } from "@/components/icons";
import { useNavbar } from "./hooks";
import type { NavLink } from "./types";

const NAV_LINKS: NavLink[] = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const { open, toggle, close } = useNavbar();

  return (
    <header className="tland-header">
      <div className="tland-wrap">
        <nav className="tland-nav">
          <Link className="tland-brand" to="/" aria-label="Dells Software home">
            <img className="tland-logo" src="/dells-softwares-logo-reverse.png" alt="Dells Software" />
          </Link>
          <div className="tland-navlinks">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
          <div className="tland-navcta">
            <Link className="tland-btn tland-btn-s" to="/login">
              Sign in
            </Link>
            <Link className="tland-btn tland-btn-p" to="/register">
              Start Free
            </Link>
          </div>
          <button
            className="tland-burger"
            id="burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobmenu"
            onClick={toggle}
          >
            <MenuIcon />
          </button>
        </nav>
        {open && (
          <div className="tland-mobmenu" id="mobmenu">
            {NAV_LINKS.map((link) => (
              <a key={link.href} className="tland-mi" href={link.href} onClick={close}>
                {link.label} <span style={{ color: "var(--tpl-t7)", fontSize: 15 }}>&rsaquo;</span>
              </a>
            ))}
            <div className="tland-mact">
              <Link className="tland-btn tland-btn-p" to="/register" onClick={close}>
                Start Free
              </Link>
              <Link className="tland-btn tland-btn-s" to="/login" onClick={close}>
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
