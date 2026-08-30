import { Link } from "react-router-dom";
import type { FooterColumnProps } from "./types";

export function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <h4>{title}</h4>
      <ul>
        {links.map((link) => (
          <li key={link.label}>
            {!link.href ? (
              <span style={{ color: "var(--tpl-t8)" }}>{link.label}</span>
            ) : link.href.startsWith("/") ? (
              <Link to={link.href}>{link.label}</Link>
            ) : (
              <a href={link.href}>{link.label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
