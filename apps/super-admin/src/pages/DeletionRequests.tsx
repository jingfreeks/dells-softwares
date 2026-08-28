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
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Account deletion requests</h1>
      <p className="text-sm text-slate-500">
        A sole admin filed each of these because deleting their account would have left their store
        with no admin at all. Approving deletes their account and closes the store (organization
        status becomes CANCELLED); denying leaves everything as-is.
      </p>

      {!mayAct && (
        <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          Your scope ({admin?.scope}) can&apos;t review deletion requests. ENGINEER or SUPERUSER is
          required.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {warning && (
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {warning}
        </p>
      )}

      {loading && <p className="mt-6 text-center text-sm text-slate-400">Loading…</p>}

      {!loading && pending.length === 0 && (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Nothing pending.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {pending.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-slate-800">{r.organizationName}</p>
                <p className="text-sm text-slate-500">{r.requestedEmail}</p>
                {r.reason && <p className="mt-1 text-sm text-slate-600">&ldquo;{r.reason}&rdquo;</p>}
                <p className="mt-1 text-xs text-slate-400">
                  Requested {new Date(r.requestedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              {mayAct && confirmingId !== r.id && (
                <button
                  type="button"
                  onClick={() => openConfirm(r.id)}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Review
                </button>
              )}
            </div>

            {confirmingId === r.id && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <label htmlFor={`note-${r.id}`} className="text-xs font-medium text-slate-500">
                  Note (visible in the audit log)
                </label>
                <textarea
                  id={`note-${r.id}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    disabled={busyId === r.id}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeny(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Deny
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    {busyId === r.id ? "Approving…" : "Approve & delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {resolved.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">Resolved</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[minmax(0,1fr)_100px_150px_minmax(0,1fr)] gap-3 border-b border-slate-200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Store / email</span>
                <span>Status</span>
                <span>Resolved by</span>
                <span>Note</span>
              </div>
              {resolved.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1fr)_100px_150px_minmax(0,1fr)] gap-3 border-b border-slate-100 px-4 py-2.5 text-sm last:border-b-0"
                >
                  <span className="truncate text-slate-700">
                    {r.organizationName} — {r.requestedEmail}
                  </span>
                  <span className={r.status === "APPROVED" ? "text-red-600" : "text-slate-500"}>{r.status}</span>
                  <span className="truncate text-slate-500">{r.resolvedByEmail ?? "—"}</span>
                  <span className="truncate text-slate-500">{r.resolutionNote ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
