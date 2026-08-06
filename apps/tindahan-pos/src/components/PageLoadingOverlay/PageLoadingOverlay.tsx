import { ARIA_LOADING } from "@/lib";

type PageLoadingOverlayVariant = "light" | "dark";

interface PageLoadingOverlayProps {
  /** Match the loading screen to the route shell it is replacing. */
  variant?: PageLoadingOverlayVariant;
}

/** Shared full-page loading state for route guards and redirects. */
export function PageLoadingOverlay({ variant = "light" }: PageLoadingOverlayProps) {
  const isDark = variant === "dark";
  return (
    <div
      className={
        isDark
          ? "tpl-root tpl-shell-bg flex h-screen items-center justify-center"
          : "flex h-screen items-center justify-center bg-[var(--color-canvas)]"
      }
    >
      <div
        role="status"
        aria-label={ARIA_LOADING}
        className={
          isDark
            ? "h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#3B82F6]"
            : "h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--color-brand)]"
        }
      />
    </div>
  );
}
