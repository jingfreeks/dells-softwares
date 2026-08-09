import { NavLink } from "react-router-dom";

const Navlinkscreen = (props: { user: any }) => {
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
