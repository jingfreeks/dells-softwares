import {
  APP_NAME,
  TEXT_TAGLINE_FREE_FIRST_STORE,
} from "@/lib";

const Headerscreen = () => {
  return (
    <div className="tpl-brand">
      <span className="tpl-mark">{APP_NAME.charAt(0)}</span>
      <div>
        <p className="tpl-bn">{APP_NAME}</p>
        <p className="tpl-bs">{TEXT_TAGLINE_FREE_FIRST_STORE}</p>
      </div>
    </div>
  );
};
export default Headerscreen;
