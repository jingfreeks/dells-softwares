import {
  APP_NAME,
  STORE_NAME,
  TEXT_WELCOME_CHOOSE_HEADLINE_PREFIX,
  TEXT_WELCOME_SUBTITLE,
  LABEL_EXPLORE_DEMO_STORE,
  TEXT_EXPLORE_DEMO_STORE_DESC,
  BUTTON_EXPLORE_DEMO_STORE,
  LABEL_SET_UP_MY_STORE,
  TEXT_SET_UP_MY_STORE_DESC,
  BUTTON_SET_UP_MY_STORE,
  useAuth,
} from "@/lib";
import "@/pages/authTheme.css";

interface WelcomeStepProps {
  onExploreDemo: () => void;
  onSetUpStore: () => void;
}

/**
 * Welcome/Choose (approved design screen 42). A destination choice, not a
 * store-creation choice: a real store already exists by the time this
 * renders (handle_new_user() creates one at signup) -- "Explore Demo Store"
 * just points the admin at an isolated sample dataset instead, leaving
 * their real store untouched until they choose "Set Up My Store".
 */
export function WelcomeStep({ onExploreDemo, onSetUpStore }: WelcomeStepProps) {
  const { user } = useAuth();
  const displayName = user?.name?.trim();

  return (
    <div
      className="tpl-root flex min-h-screen flex-col items-center justify-center gap-8 p-6 lg:p-14"
      style={{ background: "radial-gradient(90% 80% at 90% 0%, #12244A 0%, #0B142A 45%, #070B14 100%)" }}
    >
      <div className="w-full max-w-3xl">
        <div className="tpl-row" style={{ gap: 12, marginBottom: 26, justifyContent: "center" }}>
          <span className="tpl-mark">{APP_NAME.charAt(0)}</span>
          <div>
            <p className="tpl-bn" style={{ fontSize: 15 }}>
              {APP_NAME}
            </p>
            <p className="tpl-bs">{STORE_NAME}</p>
          </div>
        </div>
        <p
          style={{
            color: "var(--tpl-t1)",
            fontSize: 32,
            fontWeight: 500,
            lineHeight: 1.2,
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          {TEXT_WELCOME_CHOOSE_HEADLINE_PREFIX} {displayName || "there"}! 🎉
        </p>
        <p
          style={{
            color: "#8593AB",
            fontSize: 15,
            lineHeight: 1.6,
            marginBottom: 34,
            maxWidth: "50ch",
            marginInline: "auto",
            textAlign: "center",
          }}
        >
          {TEXT_WELCOME_SUBTITLE}
        </p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={onExploreDemo}
            aria-label={BUTTON_EXPLORE_DEMO_STORE}
            className="tpl-card"
            style={{ padding: "26px 24px", textAlign: "left", cursor: "pointer" }}
          >
            <i className="ti ti-device-desktop-analytics tpl-acc" style={{ fontSize: 28 }} aria-hidden />
            <p className="tpl-h3" style={{ marginTop: 14, marginBottom: 6, fontSize: 17 }}>
              {LABEL_EXPLORE_DEMO_STORE}
            </p>
            <p className="tpl-ts" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>
              {TEXT_EXPLORE_DEMO_STORE_DESC}
            </p>
            <span className="tpl-btn" style={{ width: "100%" }}>
              {BUTTON_EXPLORE_DEMO_STORE}
            </span>
          </button>

          <button
            type="button"
            onClick={onSetUpStore}
            aria-label={BUTTON_SET_UP_MY_STORE}
            className="tpl-card"
            style={{ padding: "26px 24px", textAlign: "left", cursor: "pointer" }}
          >
            <i className="ti ti-building-store tpl-acc" style={{ fontSize: 28 }} aria-hidden />
            <p className="tpl-h3" style={{ marginTop: 14, marginBottom: 6, fontSize: 17 }}>
              {LABEL_SET_UP_MY_STORE}
            </p>
            <p className="tpl-ts" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>
              {TEXT_SET_UP_MY_STORE_DESC}
            </p>
            <span className="tpl-btnp" style={{ width: "100%" }}>
              {BUTTON_SET_UP_MY_STORE} <i className="ti ti-arrow-right" aria-hidden />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
