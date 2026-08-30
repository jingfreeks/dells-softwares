import { Link } from "react-router-dom";
import {
  PESO,
  LABEL_SETUP_COMPLETE_CHIP,
  TEXT_REGISTER_IS_OPEN_PREFIX,
  TEXT_FALLBACK_THERE,
  TEXT_PRODUCTS_LOADED_SUFFIX,
  TEXT_ALERTS_SET_AT_PREFIX,
  TEXT_DAYS_OF_COVER,
  TEXT_AND_SEPARATOR,
  TEXT_COUNTED_INTO_DRAWER_SUFFIX,
  BUTTON_START_SELLING,
  BUTTON_SEE_THE_DASHBOARD,
  TEXT_FIRST_SALE_FOOTNOTE,
  LABEL_WHATS_SET_UP,
  LABEL_STEP_STORE_PROFILE,
  TEXT_OPEN_HOURS_PREFIX,
  TEXT_PRODUCTS_SUFFIX,
  TEXT_READY_TO_SELL,
  LABEL_STOCK_ALERTS_ITEM,
  TEXT_WARN_AT_PREFIX,
  TEXT_DAILY_AT_7AM_SUFFIX,
  LABEL_REGISTER_OPEN_ITEM,
  TEXT_FLOAT_PREFIX,
  TEXT_COUNTED_BY_YOU_SUFFIX,
  LABEL_WORTH_DOING_THIS_WEEK,
  LABEL_OPTIONAL_BADGE,
  LABEL_ADD_YOUR_STAFF,
  TEXT_ADD_STAFF_DESC,
  BUTTON_ADD,
  LABEL_ENTER_EXISTING_UTANG,
  TEXT_ENTER_UTANG_DESC,
  LABEL_CHECK_YOUR_SERVICE_FEES,
  TEXT_SERVICE_FEES_DESC,
  BUTTON_REVIEW_CHIP,
  TEXT_TRIAL_STARTED_BANNER,
} from "@/lib";
import "@/pages/authTheme.css";
import { useCongratsStep } from "../useCongratsStep";

interface CongratsStepProps {
  finishError: string | null;
  finishing: boolean;
  onFinish: (destination: "/pos" | "/admin") => void;
  trialStarted: boolean;
}

export function CongratsStep({ finishError, finishing, onFinish, trialStarted }: CongratsStepProps) {
  const { name, storeName, productCount, thresholdDays, dailySummary, registerFloat, openTimeLabel, closeTimeLabel } =
    useCongratsStep();

  const displayName = name.trim() || TEXT_FALLBACK_THERE;

  return (
    <div
      className="tpl-root grid min-h-screen grid-cols-1 items-center gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-12 lg:p-14"
      style={{ background: "radial-gradient(90% 80% at 90% 0%, #12244A 0%, #0B142A 45%, #070B14 100%)" }}
    >
      <div>
        <span className="tpl-chip tpl-g" style={{ marginBottom: 20 }}>
          <i className="ti ti-check" aria-hidden /> {LABEL_SETUP_COMPLETE_CHIP}
        </span>
        {trialStarted && (
          <p className="tpl-ts" style={{ color: "var(--tpl-ok)", marginBottom: 6 }}>
            <i className="ti ti-circle-check" aria-hidden /> {TEXT_TRIAL_STARTED_BANNER}
          </p>
        )}
        <p style={{ color: "var(--tpl-t1)", fontSize: 34, fontWeight: 500, lineHeight: 1.2, marginBottom: 12 }}>
          {TEXT_REGISTER_IS_OPEN_PREFIX} {displayName}.
        </p>
        <p style={{ color: "#8593AB", fontSize: 15, lineHeight: 1.6, marginBottom: 26, maxWidth: "44ch" }}>
          {productCount} {TEXT_PRODUCTS_LOADED_SUFFIX}, {TEXT_ALERTS_SET_AT_PREFIX} {thresholdDays}{" "}
          {TEXT_DAYS_OF_COVER}, {TEXT_AND_SEPARATOR} {PESO.format(registerFloat)} {TEXT_COUNTED_INTO_DRAWER_SUFFIX}
        </p>
        <div className="tpl-row" style={{ gap: 12, marginBottom: 16, flexWrap: "wrap", rowGap: 12 }}>
          <button
            type="button"
            className="tpl-btnp"
            style={{ width: "auto", padding: "0 24px", marginBottom: 0, whiteSpace: "nowrap" }}
            disabled={finishing}
            onClick={() => onFinish("/pos")}
          >
            <i className="ti ti-shopping-cart" aria-hidden /> {BUTTON_START_SELLING}
          </button>
          <button
            type="button"
            className="tpl-btn"
            style={{ width: "auto", padding: "0 20px", marginBottom: 0, whiteSpace: "nowrap" }}
            disabled={finishing}
            onClick={() => onFinish("/admin")}
          >
            {BUTTON_SEE_THE_DASHBOARD}
          </button>
        </div>
        {finishError && (
          <p role="alert" className="tpl-emsg" style={{ marginBottom: 10 }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {finishError}
          </p>
        )}
        <p className="tpl-ts" style={{ fontSize: 12.5 }}>
          {TEXT_FIRST_SALE_FOOTNOTE}
        </p>
      </div>

      <div>
        <div className="tpl-card" style={{ marginBottom: 14 }}>
          <p className="tpl-h3" style={{ marginBottom: 14 }}>
            {LABEL_WHATS_SET_UP}
          </p>
          <div className="tpl-lr" style={{ padding: "8px 0" }}>
            <i className="ti ti-circle-check tpl-ok" style={{ fontSize: 18 }} aria-hidden />
            <div className="tpl-flex1">
              <p className="tpl-tp">{LABEL_STEP_STORE_PROFILE}</p>
              <p className="tpl-ts">
                {storeName} &middot; {TEXT_OPEN_HOURS_PREFIX} {openTimeLabel}&ndash;{closeTimeLabel}
              </p>
            </div>
          </div>
          <div className="tpl-lr" style={{ padding: "8px 0" }}>
            <i className="ti ti-circle-check tpl-ok" style={{ fontSize: 18 }} aria-hidden />
            <div className="tpl-flex1">
              <p className="tpl-tp">
                {productCount} {TEXT_PRODUCTS_SUFFIX}
              </p>
              <p className="tpl-ts">{TEXT_READY_TO_SELL}</p>
            </div>
          </div>
          <div className="tpl-lr" style={{ padding: "8px 0" }}>
            <i className="ti ti-circle-check tpl-ok" style={{ fontSize: 18 }} aria-hidden />
            <div className="tpl-flex1">
              <p className="tpl-tp">{LABEL_STOCK_ALERTS_ITEM}</p>
              <p className="tpl-ts">
                {TEXT_WARN_AT_PREFIX} {thresholdDays} {TEXT_DAYS_OF_COVER}
                {dailySummary ? `, ${TEXT_DAILY_AT_7AM_SUFFIX}` : ""}
              </p>
            </div>
          </div>
          <div className="tpl-lr" style={{ padding: "8px 0" }}>
            <i className="ti ti-circle-check tpl-ok" style={{ fontSize: 18 }} aria-hidden />
            <div className="tpl-flex1">
              <p className="tpl-tp">{LABEL_REGISTER_OPEN_ITEM}</p>
              <p className="tpl-ts">
                {TEXT_FLOAT_PREFIX} {PESO.format(registerFloat)} {TEXT_COUNTED_BY_YOU_SUFFIX}
              </p>
            </div>
          </div>
        </div>

        <div className="tpl-card">
          <div className="tpl-sp" style={{ marginBottom: 11 }}>
            <p className="tpl-h3" style={{ fontSize: 14 }}>
              {LABEL_WORTH_DOING_THIS_WEEK}
            </p>
            <span className="tpl-ts">{LABEL_OPTIONAL_BADGE}</span>
          </div>
          <div className="tpl-lr" style={{ padding: "7px 0" }}>
            <i className="ti ti-circle" style={{ fontSize: 17, color: "var(--tpl-t8)" }} aria-hidden />
            <div className="tpl-flex1">
              <p className="tpl-tp">{LABEL_ADD_YOUR_STAFF}</p>
              <p className="tpl-ts">{TEXT_ADD_STAFF_DESC}</p>
            </div>
            <Link to="/staff" className="tpl-chip">
              {BUTTON_ADD}
            </Link>
          </div>
          <div className="tpl-lr" style={{ padding: "7px 0" }}>
            <i className="ti ti-circle" style={{ fontSize: 17, color: "var(--tpl-t8)" }} aria-hidden />
            <div className="tpl-flex1">
              <p className="tpl-tp">{LABEL_ENTER_EXISTING_UTANG}</p>
              <p className="tpl-ts">{TEXT_ENTER_UTANG_DESC}</p>
            </div>
            <Link to="/customers" className="tpl-chip">
              {BUTTON_ADD}
            </Link>
          </div>
          <div className="tpl-lr" style={{ padding: "7px 0" }}>
            <i className="ti ti-circle" style={{ fontSize: 17, color: "var(--tpl-t8)" }} aria-hidden />
            <div className="tpl-flex1">
              <p className="tpl-tp">{LABEL_CHECK_YOUR_SERVICE_FEES}</p>
              <p className="tpl-ts">{TEXT_SERVICE_FEES_DESC}</p>
            </div>
            <Link to="/pos" className="tpl-chip">
              {BUTTON_REVIEW_CHIP}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
