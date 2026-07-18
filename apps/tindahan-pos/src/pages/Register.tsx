import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { EyeIcon, EyeOffIcon } from "../components/icons";

export function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  if (user) return <Navigate to="/pos" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await register({ storeName, ownerName, email, password, confirmPassword });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setAwaitingConfirmation(true);
      return;
    }
    navigate("/pos");
  }

  if (awaitingConfirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-[var(--color-brand)]">Tindahan POS</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">Check your email</h1>
          <p role="status" className="mt-3 text-sm text-slate-600">
            We sent a confirmation link to <span className="font-medium">{email}</span>. Open it
            to activate your store, then come back and log in.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block font-medium text-[var(--color-brand)] hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--color-brand)]">Tindahan POS</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Set up your store</h1>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="storeName" className="text-sm font-medium text-slate-700">
              Store name
            </label>
            <input
              id="storeName"
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div>
            <label htmlFor="ownerName" className="text-sm font-medium text-slate-700">
              Your name
            </label>
            <input
              id="ownerName"
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div>
            <label htmlFor="regEmail" className="text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="regEmail"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div>
            <label htmlFor="regPassword" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="regPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">At least 6 characters.</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <div className="relative mt-1">
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && (
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[var(--color-brand)] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
