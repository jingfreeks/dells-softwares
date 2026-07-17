import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabaseClient";
import type { Role } from "../lib/types";

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const emptyForm = { name: "", email: "", password: "" };

export function Staff() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await supabase
      .from("staff")
      .select("id, name, email, role")
      .order("role")
      .order("name");
    if (error) {
      setLoadError(error.message);
      return;
    }
    setStaff(data ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchStaff().finally(() => setLoading(false));
  }, [fetchStaff]);

  if (user && user.role !== "admin") {
    return <Navigate to="/pos" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    if (form.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke("create-cashier", {
        body: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setForm(emptyForm);
      await fetchStaff();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create cashier account.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    setLoadError(null);
    try {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
      await fetchStaff();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not remove staff member.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-slate-900">Staff</h1>
      <p className="text-sm text-slate-500">Manage who can log in to this store.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Roster</h2>
          </div>

          {loadError && (
            <p role="alert" className="px-4 pt-4 text-sm text-red-600">
              {loadError}
            </p>
          )}

          <ul className="divide-y divide-slate-100">
            {loading && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">Loading…</li>
            )}
            {!loading &&
              staff.map((member) => (
                <li key={member.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">
                      {member.name}
                      {member.id === user?.id && (
                        <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        member.role === "admin"
                          ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {member.role}
                    </span>
                    {member.role === "cashier" && (
                      <button
                        type="button"
                        onClick={() => handleRemove(member.id)}
                        disabled={removingId === member.id}
                        className="cursor-pointer text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingId === member.id ? "Removing…" : "Remove"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            {!loading && staff.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">No staff yet.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Add a cashier</h2>
          <p className="mt-1 text-xs text-slate-500">
            Creates a login for this store only — they'll be able to use POS but not view sales
            reports or manage inventory.
          </p>

          <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="staffName" className="text-xs font-medium text-slate-700">
                Name
              </label>
              <input
                id="staffName"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="staffEmail" className="text-xs font-medium text-slate-700">
                Email address
              </label>
              <input
                id="staffEmail"
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="staffPassword" className="text-xs font-medium text-slate-700">
                Temporary password
              </label>
              <input
                id="staffPassword"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
              <p className="mt-1 text-xs text-slate-500">At least 6 characters.</p>
            </div>

            {formError && (
              <p role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <span
                  aria-hidden
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {submitting ? "Creating…" : "Create cashier account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
