import { Link } from "react-router-dom";
import { useDemoForm } from "./hooks";
import { BUSINESS_TYPES, LOCATION_OPTIONS } from "./types";

export function DemoForm() {
  const { fields, setField, errors, submitting, submitError, succeeded, handleSubmit } = useDemoForm();

  if (succeeded) {
    return (
      <div className="tland-demoform">
        <div className="tland-okmsg" role="status">
          <div className="tland-tickbig">&#10003;</div>
          <h3 style={{ marginBottom: 8 }}>Salamat &mdash; got it.</h3>
          <p style={{ fontSize: 14.5, color: "var(--tpl-t6)", maxWidth: "34ch", margin: "0 auto" }}>
            We&rsquo;ll message you within one working day to set a time. Nothing else needed from you right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="tland-demoform" onSubmit={handleSubmit} noValidate>
      {submitError && (
        <p className="tland-formerr" role="alert">
          {submitError}
        </p>
      )}
      <div className="tland-two">
        <div className={`tland-field ${errors.name ? "tland-fielderr" : ""}`}>
          <label htmlFor="demo-name">Your name</label>
          <input
            id="demo-name"
            placeholder="Juan Dela Cruz"
            value={fields.name}
            onChange={(e) => setField("name", e.target.value)}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="tland-fieldmsg">{errors.name}</p>}
        </div>
        <div className={`tland-field ${errors.businessName ? "tland-fielderr" : ""}`}>
          <label htmlFor="demo-shop">Business name</label>
          <input
            id="demo-shop"
            placeholder="Dells Software"
            value={fields.businessName}
            onChange={(e) => setField("businessName", e.target.value)}
            aria-invalid={!!errors.businessName}
          />
          {errors.businessName && <p className="tland-fieldmsg">{errors.businessName}</p>}
        </div>
      </div>
      <div className="tland-two">
        <div className={`tland-field ${errors.mobile ? "tland-fielderr" : ""}`}>
          <label htmlFor="demo-mobile">Mobile number</label>
          <input
            id="demo-mobile"
            type="tel"
            inputMode="tel"
            placeholder="0917 555 0142"
            value={fields.mobile}
            onChange={(e) => setField("mobile", e.target.value)}
            aria-invalid={!!errors.mobile}
          />
          {errors.mobile && <p className="tland-fieldmsg">{errors.mobile}</p>}
        </div>
        <div className="tland-field">
          <label htmlFor="demo-email">
            Email <span style={{ color: "var(--tpl-t7)" }}>&middot; optional</span>
          </label>
          <input
            id="demo-email"
            type="email"
            placeholder="you@business.ph"
            value={fields.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </div>
      </div>
      <div className="tland-two">
        <div className="tland-field">
          <label htmlFor="demo-type">Type of business</label>
          <select id="demo-type" value={fields.businessType} onChange={(e) => setField("businessType", e.target.value)}>
            {BUSINESS_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="tland-field">
          <label htmlFor="demo-branches">Locations</label>
          <select id="demo-branches" value={fields.locations} onChange={(e) => setField("locations", e.target.value)}>
            {LOCATION_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="tland-field">
        <label htmlFor="demo-msg">
          Anything we should know? <span style={{ color: "var(--tpl-t7)" }}>&middot; optional</span>
        </label>
        <textarea
          id="demo-msg"
          placeholder="We offer utang to about 20 suki and sell load. Currently everything is in a notebook."
          value={fields.message}
          onChange={(e) => setField("message", e.target.value)}
        />
      </div>
      <label className="tland-consent">
        <input
          type="checkbox"
          checked={fields.consent}
          onChange={(e) => setField("consent", e.target.checked)}
          aria-invalid={!!errors.consent}
        />
        <span>
          I agree to Tindahan POS contacting me about this enquiry, and to the{" "}
          <Link to="/privacy" style={{ color: "var(--tpl-a5)" }}>
            Privacy Notice
          </Link>
          .
        </span>
      </label>
      {errors.consent && <p className="tland-fieldmsg" style={{ marginTop: -12, marginBottom: 12 }}>{errors.consent}</p>}
      <button type="submit" className="tland-btn tland-btn-p" style={{ width: "100%" }} disabled={submitting}>
        {submitting ? "Sending..." : "Request a demo"}
      </button>
      <p className="tland-formnote">We reply within one working day. No cost, no obligation.</p>
    </form>
  );
}
