import {
  STORE_NAME,
  APP_NAME,
} from "@/lib";

const Titleheader = () => {
  return (
    <div className="tpl-brand">
      <span className="tpl-mark">{APP_NAME.charAt(0)}</span>
      <div>
        <p className="tpl-bn">{STORE_NAME}</p>
        <p className="tpl-bs">{APP_NAME}</p>
      </div>
    </div>
  );
};
export default Titleheader;
