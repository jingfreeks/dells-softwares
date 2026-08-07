import {
  LABEL_SIGN_OUT_EVERYWHERE,
  TEXT_SIGN_OUT_EVERYWHERE_DESC,
  BUTTON_SIGN_OUT_ALL,
} from "@/lib";

interface SignOutEverywhereNoteProps {
  signOutError: string | null;
  signingOutEverywhere: boolean;
  onSignOutEverywhere: () => void;
}

export function SignOutEverywhereNote({
  signOutError,
  signingOutEverywhere,
  onSignOutEverywhere,
}: SignOutEverywhereNoteProps) {
  return (
    <div className="tpl-note tpl-bad" style={{ marginBottom: 18, alignItems: "center" }}>
      <div className="tpl-flex1">
        <p className="tpl-nt" style={{ color: "var(--tpl-bad)" }}>
          {LABEL_SIGN_OUT_EVERYWHERE}
        </p>
        <p className="tpl-ns" style={{ color: "var(--tpl-bad)" }}>
          {TEXT_SIGN_OUT_EVERYWHERE_DESC}
        </p>
        {signOutError && (
          <p role="alert" className="tpl-ns" style={{ color: "var(--tpl-bad)", marginTop: 4 }}>
            {signOutError}
          </p>
        )}
      </div>
      <button
        type="button"
        className="tpl-chip tpl-bad"
        disabled={signingOutEverywhere}
        onClick={onSignOutEverywhere}
      >
        {BUTTON_SIGN_OUT_ALL}
      </button>
    </div>
  );
}
