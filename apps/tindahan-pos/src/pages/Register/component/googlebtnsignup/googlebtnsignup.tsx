import {
  PAGE_HEADING_REGISTER,
  TEXT_REGISTER_SUBHEAD,
  BUTTON_SIGNUP_WITH_GOOGLE,
  BUTTON_SIGNING_IN,
  TEXT_OR,
} from "@/lib";

interface GooglebtnsignupProps {
  agreedToTerms: boolean;
  submitting: boolean;
  onClick: () => void;
}

const Googlebtnsignup = ({ agreedToTerms, submitting, onClick }: GooglebtnsignupProps) => {
  return (
    <>
      <p className="tpl-h2">{PAGE_HEADING_REGISTER}</p>
      <p className="tpl-sub">{TEXT_REGISTER_SUBHEAD}</p>

      <button
        type="button"
        className="tpl-btn"
        disabled={submitting || !agreedToTerms}
        title={agreedToTerms ? undefined : "Agree to the Terms of Service and Privacy Policy first"}
        onClick={onClick}
      >
        <i className="ti ti-brand-google" aria-hidden />
        {submitting ? BUTTON_SIGNING_IN : BUTTON_SIGNUP_WITH_GOOGLE}
      </button>

      <div className="tpl-or-row">
        <span className="line" />
        <span className="word">{TEXT_OR}</span>
        <span className="line" />
      </div>
    </>
  );
};
export default Googlebtnsignup;
