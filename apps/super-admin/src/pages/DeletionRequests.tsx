import { useCallback, useEffect, useState } from "react";
import {
  approveDeletionRequest,
  denyDeletionRequest,
  listDeletionRequests,
  usePlatform,
  type DeletionRequest,
} from "../lib/platform";

export function DeletionRequests() {
  const { admin } = usePlatform();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    const rows = await listDeletionRequests();
    setRequests(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load requests."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Same gate as platform_deny_deletion_request()/platform_deletion_requests()
  // -- account deletion is a security/ops action, not a billing one.
  const mayAct = admin?.scope === "ENGINEER" || admin?.scope === "SUPERUSER";

  function openConfirm(id: string) {
    setNote("");
    setError(null);
    setWarning(null);
    setConfirmingId(id);
  }

  async function handleDeny(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await denyDeletionRequest(id, note);
      setConfirmingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deny the request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const { warning: w } = await approveDeletionRequest(id, note);
      setConfirmingId(null);
      if (w) setWarning(w);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve the request.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const resolved = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="px-7 py-6">
      <header className="mb-5">
        <h1 className="text-[19px] font-semibold" style={{ color: "var(--t1)" }}>
          Account deletion requests
        </h1>
        <p className="mt-0.5 max-w-[70ch] text-[12.5px]" style={{ color: "var(--t6)" }}>
          A sole admin filed each of these because deleting their account would have left their
          store with no admin at all. Approving deletes their account and closes the store —
          the organization becomes CANCELLED. Denying leaves everything as it is.
        </p>
      </header>

      {!mayAct && (
        <div className="card mb-4 p-4">
          <p className="text-[13px]" style={{ color: "var(--t5)" }}>
            Your scope ({admin?.scope ?? "none"}) can&apos;t review deletion requests. ENGINEER or
            SUPERUSER is required.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border p-3.5"
          style={{ background: "rgba(248,113,113,.07)", borderColor: "rgba(248,113,113,.24)" }}
        >
          <p className="text-[13px]" style={{ color: "var(--bad)" }}>{error}</p>
        </div>
      )}
      {warning && (
        <div
          role="alert"
          className="mb-4 rounded-xl border p-3.5"
          style={{ background: "rgba(251,191,36,.07)", borderColor: "rgba(251,191,36,.24)" }}
        >
          <p className="text-[13px]" style={{ color: "var(--warn)" }}>{warning}</p>
        </div>
      )}

      {loading && (
        <p className="py-10 text-center text-[13px]" style={{ color: "var(--t6)" }}>Loading…</p>
      )}

      {!loading && pending.length === 0 && (
        <div className="card px-4 py-10 text-center">
          <p className="text-[13px]" style={{ color: "var(--t6)" }}>Nothing pending.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {pending.map((r) => {
          const open = confirmingId === r.id;
          return (
            <div
              key={r.id}
              className="rounded-2xl border p-4"
              style={
                open
                  ? { background: "rgba(248,113,113,.05)", borderColor: "rgba(248,113,113,.28)" }
                  : { background: "var(--gl3)", borderColor: "var(--bd2)" }
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium" style={{ color: "var(--t2)" }}>
                    {r.organizationName}
                  </h2>
                  <p className="text-[12.5px]" style={{ color: "var(--t5)" }}>{r.requestedEmail}</p>
                  {r.reason && (
                    <p className="mt-1.5 max-w-[70ch] text-[12.5px]" style={{ color: "var(--t4)" }}>
                      &ldquo;{r.reason}&rdquo;
                    </p>
                  )}
                  <p className="mt-1.5 text-[11.5px] tabular-nums" style={{ color: "var(--t9)" }}>
                    Requested{" "}
                    {new Date(r.requestedAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {mayAct && !open && (
                  <button
                    type="button"
                    onClick={() => openConfirm(r.id)}
                    className="shrink-0 cursor-pointer rounded-lg border px-3 py-1.5 text-[12.5px] font-medium hover:bg-white/5"
                    style={{ borderColor: "var(--bd)", color: "var(--t3)" }}
                  >
                    Review
                  </button>
                )}
              </div>

              {open && (
                <div className="mt-4 border-t pt-3.5" style={{ borderColor: "rgba(248,113,113,.20)" }}>
                  {/* The consequence is spelled out at the moment of the decision,
                      naming this store and this account -- not left to the page
                      header, which is out of view by the time the button is hit. */}
                  <p className="mb-3 text-[12.5px]" style={{ color: "var(--t4)" }}>
                    Approving deletes{" "}
                    <span style={{ color: "var(--t2)" }}>{r.requestedEmail}</span> and closes{" "}
                    <span style={{ color: "var(--t2)" }}>{r.organizationName}</span>. This cannot be
                    undone.
                  </p>

                  <label
                    htmlFor={`note-${r.id}`}
                    className="mb-1 block text-[11px] font-medium"
                    style={{ color: "var(--t6)" }}
                  >
                    Note (visible in the audit log)
                  </label>
                  <textarea
                    id={`note-${r.id}`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2 text-[12.5px] outline-none focus:border-[var(--a3)]"
                    style={{ background: "var(--gl3)", borderColor: "var(--bd)", color: "var(--t1)" }}
                  />

                  {/* Deny sits with Cancel; the irreversible action is pushed to
                      its own side so the two are not neighbours under the cursor. */}
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={busyId === r.id}
                        className="cursor-pointer rounded-lg border px-3 py-1.5 text-[12.5px] font-medium hover:bg-white/5 disabled:opacity-50"
                        style={{ borderColor: "var(--bd)", color: "var(--t5)" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeny(r.id)}
                        disabled={busyId === r.id}
                        className="cursor-pointer rounded-lg border px-3 py-1.5 text-[12.5px] font-medium hover:bg-white/5 disabled:opacity-50"
                        style={{ borderColor: "var(--bd)", color: "var(--t3)" }}
                      >
                        Deny
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApprove(r.id)}
                      disabled={busyId === r.id}
                      className="cursor-pointer rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
                      style={{ background: "#DC2626" }}
                    >
                      {busyId === r.id ? "Approving…" : "Approve & delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {resolved.length > 0 && (
        <>
          <h2
            className="mt-8 mb-3 text-[11px] font-semibold"
            style={{ color: "var(--t6)", letterSpacing: ".5px" }}
          >
            RESOLVED
          </h2>
          <div className="card overflow-x-auto">
            <div className="min-w-[760px]">
              <div
                className="grid gap-3 border-b px-4 py-2.5 text-[11px] font-semibold"
                style={{ gridTemplateColumns: RCOLS, borderColor: "var(--bd3)", color: "var(--t6)", letterSpacing: ".5px" }}
              >
                <span>STORE / EMAIL</span>
                <span>OUTCOME</span>
                <span>RESOLVED BY</span>
                <span>NOTE</span>
              </div>
              {resolved.map((r) => (
                <div
                  key={r.id}
                  className="grid items-center gap-3 border-b px-4 py-2.5 last:border-0"
                  style={{ gridTemplateColumns: RCOLS, borderColor: "var(--bd3)" }}
                >
                  <span className="truncate text-[12.5px]" style={{ color: "var(--t3)" }}>
                    {r.organizationName} — {r.requestedEmail}
                  </span>
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: r.status === "APPROVED" ? "var(--bad)" : "var(--t5)" }}
                  >
                    {r.status}
                  </span>
                  <span className="truncate text-[12.5px]" style={{ color: "var(--t5)" }}>
                    {r.resolvedByEmail ?? "—"}
                  </span>
                  <span className="truncate text-[12.5px]" style={{ color: "var(--t6)" }}>
                    {r.resolutionNote ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const RCOLS = "minmax(0,1fr) 100px 150px minmax(0,1fr)";
