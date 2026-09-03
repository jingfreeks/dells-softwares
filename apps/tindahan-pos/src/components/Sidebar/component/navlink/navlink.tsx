import { NavLink } from "react-router-dom";
import type { StaffAccount } from "@/lib/types";

// Nullable because useAuth() has no user before the session resolves, which is
// what every `user?.` below is already guarding against.
const Navlinkscreen = (props: { user: StaffAccount | null }) => {
    const { user } = props
  return (
    <NavLink to="/settings/profile" className="tpl-ub">
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="tpl-av-s" />
      ) : (
        <span className="tpl-av-s">
          {user?.name?.charAt(0).toUpperCase() ?? "?"}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="tpl-tp truncate">{user?.name}</p>
        {user?.role && <p className="tpl-ts uppercase">{user.role}</p>}
      </div>
    </NavLink>
  );
};
export default Navlinkscreen;
