import { Link, Navigate } from "react-router-dom";
import {
  STORE_NAME,
  APP_NAME,
  PAGE_HEADING_LOGIN_PREFIX,
  LABEL_EMAIL_ADDRESS,
  LABEL_PASSWORD,
  LINK_FORGOT_PASSWORD,
  LABEL_LOG_IN,
  BUTTON_LOGGING_IN,
  TEXT_NEW_STORE_PROMPT,
  LINK_REGISTER,
} from "@/lib";
import { AuthErrorMessage, PasswordField } from "./component";
import { useLoginForm } from "./hooks";

export function Login() {
  const {
    user,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    toggleShowPassword,
    error,
    submitting,
    handleSubmit,
  } = useLoginForm();

  if (user) return <Navigate to="/pos" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--color-brand)]">{APP_NAME}</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">
          {PAGE_HEADING_LOGIN_PREFIX} {STORE_NAME}
        </h1>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              {LABEL_EMAIL_ADDRESS}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                {LABEL_PASSWORD}
              </label>
              <Link to="/forgot-password" className="text-xs text-[var(--color-brand)] hover:underline">
                {LINK_FORGOT_PASSWORD}
              </Link>
            </div>
            <PasswordField
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggleVisible={toggleShowPassword}
            />
          </div>

          <AuthErrorMessage error={error} />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && (
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            {submitting ? BUTTON_LOGGING_IN : LABEL_LOG_IN}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {TEXT_NEW_STORE_PROMPT}{" "}
          <Link to="/register" className="font-medium text-[var(--color-brand)] hover:underline">
            {LINK_REGISTER}
          </Link>
        </p>
      </div>
    </div>
  );
}
