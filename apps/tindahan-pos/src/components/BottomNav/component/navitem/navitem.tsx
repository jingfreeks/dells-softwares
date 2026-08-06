import { NavLink } from "react-router-dom";
import { NAV_ICONS } from "@/components/navIcons";
import "@/pages/authTheme.css";
import type { NavItem as AppNavItem } from "@/lib/nav";

const NavItem = ({ dataItems }: { dataItems: AppNavItem[] }) => {
  return (
    <>
      {dataItems?.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? "tpl-on" : "")}
          >
            <span className="tpl-bottom-nav-icon">
              <Icon />
            </span>
            {item.label}
          </NavLink>
        );
      })}
    </>
  );
};
export default NavItem;
