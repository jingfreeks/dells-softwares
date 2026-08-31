import { ALPHA_MODE_BADGE, isAlphaMode } from "@/lib";

/**
 * §13's in-app indicator. Renders nothing outside ALPHA, so it
 * disappears on its own once the mode changes rather than needing to be
 * hunted down and deleted.
 *
 * Mounted in ProtectedRoute so every signed-in role sees it -- cashiers
 * included. The point is that nobody operating the till assumes this is
 * already an accredited production POS.
 */
export function AlphaModeBadge() {
  if (!isAlphaMode()) return null;

  return (
    <div
      role="status"
      aria-label={ALPHA_MODE_BADGE}
      style={{
        background: "rgba(251,191,36,.14)",
        border: "1px solid rgba(251,191,36,.40)",
        color: "var(--tpl-warnd, #B08A2E)",
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: ".04em",
        display: "inline-block",
        margin: "6px 0 0 12px",
      }}
    >
      {ALPHA_MODE_BADGE}
    </div>
  );
}
