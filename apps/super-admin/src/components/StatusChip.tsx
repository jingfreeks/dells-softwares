/**
 * Subscription/lifecycle chip, shared by the organizations table and the
 * organization header so one state never renders two different ways.
 *
 * The organization's own status outranks its subscription: a CANCELLED
 * organization is cancelled whatever its subscription row still says.
 * That is the same precedence core.org_writes_allowed() applies, so the
 * console cannot show a tenant as Active while the database treats it as
 * closed.
 */
export function StatusChip({
  status,
  orgStatus,
}: {
  status: string | null;
  orgStatus?: string;
}) {
  const effective = orgStatus === "CANCELLED" || orgStatus === "SUSPENDED" ? orgStatus : status;
  const { label, fg, bg, bd } = TONE[effective ?? "NONE"] ?? TONE.NONE;

  return (
    <span
      className="inline-block rounded-full border px-2 py-0.5 text-[11.5px] font-medium"
      style={{ color: fg, background: bg, borderColor: bd }}
    >
      {label}
    </span>
  );
}

const ok = { fg: "var(--okd)", bg: "rgba(74,222,128,.10)", bd: "rgba(74,222,128,.24)" };
const warn = { fg: "var(--warn)", bg: "rgba(251,191,36,.10)", bd: "rgba(251,191,36,.24)" };
const bad = { fg: "var(--bad)", bg: "rgba(248,113,113,.10)", bd: "rgba(248,113,113,.24)" };
const mute = { fg: "var(--t6)", bg: "var(--gl3)", bd: "var(--bd)" };

const TONE: Record<string, { label: string; fg: string; bg: string; bd: string }> = {
  ACTIVE: { label: "Active", ...ok },
  TRIALING: { label: "Trial", ...warn },
  PAST_DUE: { label: "Past due", ...warn },
  SUSPENDED: { label: "Suspended", ...bad },
  CANCELLED: { label: "Cancelled", ...mute },
  NONE: { label: "No subscription", ...mute },
};
