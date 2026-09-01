import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listOrganizations, type Organization } from "../lib/platform";
import { StatusChip } from "../components/StatusChip";

/**
 * Organizations (platform-organizations.html).
 *
 * Two places where the design and the backend disagree, resolved towards
 * the backend rather than towards the picture:
 *
 *   - The design's second line under each store is the owner's email.
 *     platform_organizations() does not return an owner, so the row shows
 *     the organization id instead -- real, and the thing a support
 *     conversation actually needs to quote.
 *   - The design's fourth column is "ADMINS". The RPC returns a staff
 *     count, not an admin count. Labelling staff as admins would be a
 *     wrong number rather than a missing one, so the column says STAFF.
 */
export function Organizations() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listOrganizations()
      .then((rows) => !cancelled && setOrgs(rows))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Unable to load organizations."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) => o.name.toLowerCase().includes(q) || o.organizationId.toLowerCase().includes(q)
    );
  }, [orgs, query]);

  return (
    <div className="px-7 py-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold" style={{ color: "var(--t1)" }}>Organizations</h1>
          <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--t6)" }}>
            Every store running on Tindahan POS — plan, status and staff count at a glance.
          </p>
        </div>
        <div className="w-60">
          <label htmlFor="org-search" className="sr-only">Search organizations</label>
          <input
            id="org-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stores or id…"
            className="w-full rounded-xl border px-3 py-2 text-[13px] outline-none focus:border-[var(--a3)]"
            style={{ background: "var(--gl3)", borderColor: "var(--bd)", color: "var(--t1)" }}
          />
        </div>
      </header>

      {error && (
        <div className="card mb-4 p-4" role="alert">
          <p className="text-[13px]" style={{ color: "var(--bad)" }}>{error}</p>
        </div>
      )}

      {/* Five columns need real width; scroll the table rather than let the
          columns collapse into each other on a narrow window. */}
      <div className="card overflow-x-auto">
        <div className="min-w-[820px]">
          <div
            className="grid gap-3 border-b px-4 py-2.5 text-[11px] font-semibold"
            style={{ gridTemplateColumns: COLS, borderColor: "var(--bd3)", color: "var(--t6)", letterSpacing: ".5px" }}
          >
            <span>STORE</span>
            <span>PLAN</span>
            <span>STATUS</span>
            <span className="text-right">STAFF</span>
            <span>CREATED</span>
          </div>

          {loading && (
            <p className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--t6)" }}>Loading…</p>
          )}

          {!loading && !error && filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--t6)" }}>
              {orgs.length === 0
                ? "No organizations yet."
                : `No organization matches “${query.trim()}”.`}
            </p>
          )}

          {!loading &&
            filtered.map((o) => (
              <button
                key={o.organizationId}
                type="button"
                onClick={() => navigate(`/organizations/${o.organizationId}`)}
                className="grid w-full cursor-pointer items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/[.03]"
                style={{ gridTemplateColumns: COLS, borderColor: "var(--bd3)" }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px]" style={{ color: "var(--t2)" }}>{o.name}</span>
                  <span className="techno block truncate" style={{ color: "var(--t9)" }}>{o.organizationId}</span>
                </span>
                <span className="text-[12.5px]" style={{ color: "var(--t5)" }}>{o.planCode ?? "No plan"}</span>
                <span><StatusChip status={o.subscriptionStatus} orgStatus={o.status} /></span>
                <span className="text-right text-[12.5px] tabular-nums" style={{ color: "var(--t5)" }}>
                  {o.staffCount}
                </span>
                <span className="text-[12.5px] tabular-nums" style={{ color: "var(--t5)" }}>
                  {new Date(o.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </button>
            ))}
        </div>
      </div>

      {!loading && orgs.length > 0 && (
        <p className="mt-3 text-[11.5px]" style={{ color: "var(--t9)" }}>
          Showing {filtered.length} of {orgs.length}. Search runs in the browser —
          platform_organizations() returns the full set and has no server-side filter.
        </p>
      )}
    </div>
  );
}

const COLS = "minmax(0,2.2fr) 100px 150px 90px 120px";
