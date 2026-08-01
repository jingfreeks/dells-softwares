import { Link, Navigate } from "react-router-dom";
import {
  APP_NAME,
  PAGE_HEADING_REGISTER,
  LABEL_STORE_NAME,
  LABEL_OWNER_NAME,
  LABEL_EMAIL_ADDRESS,
  LABEL_PASSWORD,
  LABEL_CONFIRM_PASSWORD,
  HINT_PASSWORD_MIN_LENGTH,
  ARIA_SHOW_PASSWORD,
  ARIA_HIDE_PASSWORD,
  ARIA_SHOW_CONFIRM_PASSWORD,
  ARIA_HIDE_CONFIRM_PASSWORD,
  BUTTON_CREATE_ACCOUNT,
  BUTTON_CREATING_ACCOUNT,
  TEXT_HAVE_ACCOUNT_PROMPT,
  LABEL_LOG_IN,
} from "@/lib";
import { PasswordField, ConfirmationSentScreen, AuthErrorMessage } from "./component";
import { useRegisterForm } from "./hooks";

export function Register() {
  const {
    user,
    storeName,
    setStoreName,
    ownerName,
    setOwnerName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    toggleShowPassword,
    showConfirmPassword,
    toggleShowConfirmPassword,
    error,
    submitting,
    awaitingConfirmation,
    handleSubmit,
  } = useRegisterForm();

  if (user) return <Navigate to="/pos" replace />;
  if (awaitingConfirmation) return <ConfirmationSentScreen email={email} />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--color-brand)]">{APP_NAME}</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{PAGE_HEADING_REGISTER}</h1>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="storeName" className="text-sm font-medium text-slate-700">
              {LABEL_STORE_NAME}
            </label>
            <input
              id="storeName"
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div>
            <label htmlFor="ownerName" className="text-sm font-medium text-slate-700">
              {LABEL_OWNER_NAME}
            </label>
            <input
              id="ownerName"
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div>
            <label htmlFor="regEmail" className="text-sm font-medium text-slate-700">
              {LABEL_EMAIL_ADDRESS}
            </label>
            <input
              id="regEmail"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div>
            <label htmlFor="regPassword" className="text-sm font-medium text-slate-700">
              {LABEL_PASSWORD}
            </label>
            <PasswordField
              id="regPassword"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggleVisible={toggleShowPassword}
              ariaShowLabel={ARIA_SHOW_PASSWORD}
              ariaHideLabel={ARIA_HIDE_PASSWORD}
              minLength={8}
            />
            <p className="mt-1 text-xs text-slate-500">{HINT_PASSWORD_MIN_LENGTH}</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
              {LABEL_CONFIRM_PASSWORD}
            </label>
            <PasswordField
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirmPassword}
              onToggleVisible={toggleShowConfirmPassword}
              ariaShowLabel={ARIA_SHOW_CONFIRM_PASSWORD}
              ariaHideLabel={ARIA_HIDE_CONFIRM_PASSWORD}
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
            {submitting ? BUTTON_CREATING_ACCOUNT : BUTTON_CREATE_ACCOUNT}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {TEXT_HAVE_ACCOUNT_PROMPT}{" "}
          <Link to="/login" className="font-medium text-[var(--color-brand)] hover:underline">
            {LABEL_LOG_IN}
          </Link>
        </p>
      </div>
    </div>
  );
}
