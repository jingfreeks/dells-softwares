import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { DEMO_ADMIN, DEMO_PASSWORD, STORE_NAME } from "../lib/mockData";

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/pos" replace />;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = login(email, password);
    if (result.ok) {
      navigate("/pos");
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--color-brand)]">Tindahan POS</p>
        <h1 className="mt-1 text-xl font-semibold text-stone-900">Log in to {STORE_NAME}</h1>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-stone-700">
              Email or phone
            </label>
            <input
              id="email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-stone-700">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-[var(--color-brand)] hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-2 cursor-pointer rounded-lg bg-[var(--color-brand)] py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-dark)]"
          >
            Log in
          </button>
        </form>

        <p className="mt-4 text-xs text-stone-500">
          Demo admin: <span className="font-mono">{DEMO_ADMIN.email}</span> /{" "}
          <span className="font-mono">{DEMO_PASSWORD}</span>
        </p>

        <p className="mt-6 text-center text-sm text-stone-600">
          New store?{" "}
          <Link to="/register" className="font-medium text-[var(--color-brand)] hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
