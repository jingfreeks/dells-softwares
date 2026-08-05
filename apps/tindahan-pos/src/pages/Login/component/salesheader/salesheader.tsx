import {
  TEXT_LOGIN_PREVIEW_DASHBOARD_LABEL,
  TEXT_LOGIN_PREVIEW_LIVE,
} from "@/lib";
const Salesheader = () => {
  return (
    <div className="tpl-sp" style={{ marginBottom: 14 }}>
      <p className="tpl-h3">{TEXT_LOGIN_PREVIEW_DASHBOARD_LABEL}</p>
      <span className="tpl-chip tpl-g">{TEXT_LOGIN_PREVIEW_LIVE}</span>
    </div>
  );
};
export default Salesheader;
