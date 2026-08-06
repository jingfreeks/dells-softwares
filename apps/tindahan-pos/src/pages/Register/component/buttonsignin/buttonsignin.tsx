import { useNavigate } from "react-router-dom";
import {
  SEG_SIGN_IN,
  SEG_CREATE_ACCOUNT,
} from "@/lib";

const Buttonsigninscreen = () => {
  const navigate = useNavigate();
  return (
    <div className="tpl-seg" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected="false"
        onClick={() => navigate("/login")}
      >
        {SEG_SIGN_IN}
      </button>
      <button type="button" role="tab" aria-selected="true" className="tpl-on">
        {SEG_CREATE_ACCOUNT}
      </button>
    </div>
  );
};
export default Buttonsigninscreen;
