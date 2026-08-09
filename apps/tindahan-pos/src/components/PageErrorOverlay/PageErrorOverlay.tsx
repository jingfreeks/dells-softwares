import { BUTTON_TRY_AGAIN } from "@/lib";

type PageErrorOverlayVariant = "light" | "dark";

interface PageErrorOverlayProps {
  /** Match the error screen to the route shell it is replacing. */
  variant?: PageErrorOverlayVariant;
  title: string;
  message: string;
  onRetry: () => void;
}

/** Shared full-page error state for route guards — never let a failed
 * connection/initialization render as a blank screen. */
export function PageErrorOverlay({ variant = "light", title, message, onRetry }: PageErrorOverlayProps) {
  const isDark = variant === "dark";
  return (
    <div
      className={
        isDark
          ? "tpl-root tpl-shell-bg flex h-screen flex-col items-center justify-center gap-4 p-6 text-center"
          : "flex h-screen flex-col items-center justify-center gap-4 bg-[var(--color-canvas)] p-6 text-center"
      }
    >
      <i
        className="ti ti-plug-connected-x"
        aria-hidden
        style={{ fontSize: 32, color: isDark ? "var(--tpl-bad)" : "var(--color-brand)" }}
      />
      <p className={isDark ? "tpl-h3" : "text-lg font-semibold text-slate-900"}>{title}</p>
      <p className={isDark ? "tpl-ts" : "text-sm text-slate-600"} style={{ maxWidth: 340 }}>
        {message}
      </p>
      <button type="button" className={isDark ? "tpl-btnp" : "tpl-btn"} style={{ width: "auto" }} onClick={onRetry}>
        {BUTTON_TRY_AGAIN}
      </button>
    </div>
  );
}
