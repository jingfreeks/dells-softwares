import { useEffect, useMemo, useState } from "react";
import { listPlatformAudit, usePlatform, type PlatformAuditEntry } from "../lib/platform";

/**
 * Platform audit (platform-platform-audit.html, -filtered, -detail).
 *
 * The three design files are states of one screen, not three features, so
 * this is one page: a filter bar, the table, and an expanded row.
 *
 * The design's filter bar includes a severity control. There is no
 * severity on core.platform_audit_logs and platform_audit() does not
 * return one, so that control is absent rather than present-and-inert --
 * a filter that visibly does nothing is worse than one that is missing.
 */
export function Audit() {
  const { admin } = usePlatform();
  const [entries, setEntries] = useState<PlatformAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [since, setSince] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPlatformAudit(200)
      .then((rows) => !cancelled && setEntries(rows))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Unable to load the audit log."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // ENGINEER scope only, matching the RLS policy on core.platform_audit_logs.
  // SUPERUSER satisfies it; SUPPORT and BILLING legitimately get nothing.
  const mayRead = admin?.scope === "ENGINEER" || admin?.scope === "SUPERUSER";

  const actions = useMemo(
    () => [...new Set(entries.map((e) => e.action))].sort(),
    [entries]
  );
  const actors = useMemo(
    () => [...new Set(entries.map((e) => e.actorEmail).filter((a): a is string => !!a))].sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = since ? new Date(since).getTime() : null;
    return entries.filter((e) => {
      if (action && e.action !== action) return false;
      if (actor && e.actorEmail !== actor) return false;
      if (from !== null && new Date(e.createdAt).getTime() < from) return false;
      if (!q) return true;
      return [e.action, e.actorEmail, e.reason, e.entityType, e.entityId]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [entries, query, action, actor, since]);

  const filtersOn = Boolean(query.trim() || action || actor || since);

  return (
    <div className="px-7 py-6">
      <header className="mb-5">
        <h1 className="text-[19px] font-semibold" style={{ color: "var(--t1)" }}>Platform audit</h1>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--t6)" }}>
          Platform-level actions that belong to no single tenant — admin grants, module changes,
          break-glass bootstraps.
        </p>
      </header>

      {!mayRead && (
        <div className="card mb-4 p-4">
          <p className="text-[13px]" style={{ color: "var(--t5)" }}>
            Your scope ({admin?.scope ?? "none"}) can&apos;t read the platform audit. ENGINEER or
            SUPERUSER is required.
          </p>
        </div>
      )}

      {error && (
        <div className="card mb-4 p-4" role="alert">
          <p className="text-[13px]" style={{ color: "var(--bad)" }}>{error}</p>
        </div>
      )}

      {mayRead && (
        <>
          <div className="card mb-4 flex flex-wrap items-end gap-3 p-3.5">
            <Field label="Search" htmlFor="audit-q">
              <input
                id="audit-q"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Action, actor, reason…"
                className="w-56 rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--a3)]"
                style={{ background: "var(--gl3)", borderColor: "var(--bd)", color: "var(--t1)" }}
              />
            </Field>
            <Field label="Action" htmlFor="audit-action">
              <Select id="audit-action" value={action} onChange={setAction} options={actions} anyLabel="Any action" />
            </Field>
            <Field label="Actor" htmlFor="audit-actor">
              <Select id="audit-actor" value={actor} onChange={setActor} options={actors} anyLabel="Any actor" />
            </Field>
            <Field label="Since" htmlFor="audit-since">
              <input
                id="audit-since"
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--a3)]"
                style={{ background: "var(--gl3)", borderColor: "var(--bd)", color: "var(--t1)" }}
              />
            </Field>
            {filtersOn && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setAction("");
                  setActor("");
                  setSince("");
                }}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[12.5px] hover:bg-white/5"
                style={{ color: "var(--a4)" }}
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="card overflow-x-auto">
            <div className="min-w-[760px]" role="region" aria-label="Audit events">
              <div
                className="grid gap-3 border-b px-4 py-2.5 text-[11px] font-semibold"
                style={{ gridTemplateColumns: COLS, borderColor: "var(--bd3)", color: "var(--t6)", letterSpacing: ".5px" }}
              >
                <span>WHEN</span>
                <span>ACTION</span>
                <span>ACTOR</span>
                <span>REASON</span>
              </div>

              {loading && (
                <p className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--t6)" }}>Loading…</p>
              )}

              {!loading && filtered.length === 0 && (
                <p className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--t6)" }}>
                  {entries.length === 0
                    ? "No platform actions recorded yet."
                    : "No audit event matches these filters."}
                </p>
              )}

              {!loading &&
                filtered.map((e) => (
                  <div key={e.id} className="border-b last:border-0" style={{ borderColor: "var(--bd3)" }}>
                    <button
                      type="button"
                      aria-expanded={openId === e.id}
                      onClick={() => setOpenId(openId === e.id ? null : e.id)}
                      className="grid w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[.03]"
                      style={{ gridTemplateColumns: COLS }}
                    >
                      <span className="text-[12.5px] tabular-nums" style={{ color: "var(--t5)" }}>
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                      <span className="techno truncate" style={{ color: "var(--t2)" }}>{e.action}</span>
                      <span className="truncate text-[12.5px]" style={{ color: "var(--t5)" }}>
                        {e.actorEmail ?? "system"}
                      </span>
                      <span className="truncate text-[12.5px]" style={{ color: "var(--t6)" }}>
                        {e.reason ?? "—"}
                      </span>
                    </button>

                    {openId === e.id && (
                      <div className="px-4 pb-3.5" style={{ background: "var(--gl3)" }} role="region" aria-label="Audit event detail">
                        <dl className="grid gap-x-6 gap-y-1.5 pt-1 sm:grid-cols-2">
                          <Detail label="Action" value={e.action} mono />
                          <Detail label="Actor" value={e.actorEmail ?? "system"} />
                          <Detail label="Entity type" value={e.entityType} mono />
                          <Detail label="Entity id" value={e.entityId ?? "—"} mono />
                          <Detail label="When" value={new Date(e.createdAt).toLocaleString()} />
                          <Detail label="Reason" value={e.reason ?? "—"} />
                        </dl>
                        {/* core.platform_audit_logs has always stored these;
                            platform_audit() simply did not project them until
                            20260902110000. Each is rendered only when the row
                            actually carries it -- a grant has no "before", and a
                            row written by a trigger has no request behind it. */}
                        {(e.oldData || e.newData) && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <Snapshot label="Before" value={e.oldData} />
                            <Snapshot label="After" value={e.newData} />
                          </div>
                        )}

                        {(e.ipAddress || e.userAgent) && (
                          <dl className="mt-2.5 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                            {e.ipAddress && <Detail label="IP address" value={e.ipAddress} mono />}
                            {e.userAgent && <Detail label="User agent" value={e.userAgent} />}
                          </dl>
                        )}

                        <p className="mt-2.5 text-[11.5px]" style={{ color: "var(--t9)" }}>
                          {!e.oldData && !e.newData && !e.ipAddress
                            ? "This row carries no before/after snapshot or request metadata. "
                            : ""}
                          Audit rows are append-only — a database trigger refuses updates and
                          deletes, so there is nothing to edit here.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {!loading && entries.length > 0 && (
            <p className="mt-3 text-[11.5px]" style={{ color: "var(--t9)" }}>
              Showing {filtered.length} of {entries.length} most recent events. Filtering runs in
              the browser — platform_audit() takes a row limit and no filter arguments.
            </p>
          )}
        </>
      )}
    </div>
  );
}

const COLS = "170px minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.4fr)";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-[11px] font-medium" style={{ color: "var(--t6)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  id,
  value,
  onChange,
  options,
  anyLabel,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  anyLabel: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-[190px] rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--a3)]"
      style={{ background: "var(--gl3)", borderColor: "var(--bd)", color: "var(--t1)" }}
    >
      <option value="">{anyLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-[11.5px]" style={{ color: "var(--t6)" }}>{label}</dt>
      <dd className={`min-w-0 break-all ${mono ? "techno" : "text-[12px]"}`} style={{ color: "var(--t3)" }}>
        {value}
      </dd>
    </div>
  );
}

/** A before/after snapshot. Renders "none recorded" rather than an empty box:
 *  an action with no prior state is a fact worth showing, not a gap. */
function Snapshot({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  return (
    <div className="rounded-lg border p-2.5" style={{ borderColor: "var(--bd3)" }}>
      <p className="mb-1 text-[11px] font-semibold" style={{ color: "var(--t6)", letterSpacing: ".5px" }}>
        {label.toUpperCase()}
      </p>
      {value ? (
        <pre className="techno overflow-x-auto whitespace-pre-wrap break-all" style={{ color: "var(--t3)", margin: 0 }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <p className="text-[11.5px]" style={{ color: "var(--t9)" }}>none recorded</p>
      )}
    </div>
  );
}
