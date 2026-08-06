import {
  STORE_NAME,
  APP_NAME,
} from "@/lib";
import "@/pages/authTheme.css";

const Headerscreen = () => {
  return (
    <div className="tpl-brand">
      <span
        className="tpl-mark"
        style={{ width: 30, height: 30, borderRadius: 9, fontSize: 13 }}
      >
        {STORE_NAME.charAt(0)}
      </span>
      <div className="min-w-0">
        <p className="tpl-bn truncate">{STORE_NAME}</p>
        <p className="tpl-bs">{APP_NAME}</p>
      </div>
    </div>
  );
};
export default Headerscreen;
