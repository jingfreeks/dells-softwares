import { NavLink } from "react-router-dom";
import {
  ARIA_MAIN_NAV,
} from "@/lib";
import { NAV_ICONS } from "@/components/navIcons";
import type { NavItem } from "@/lib/nav";

const NavList = ({ navItems }: { navItems: NavItem[] }) => {
  return (
    <nav className="flex flex-1 flex-col" aria-label={ARIA_MAIN_NAV}>
      {navItems.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `tpl-navi${isActive ? " tpl-on" : ""}`}
          >
            <Icon />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
};
export default NavList;
