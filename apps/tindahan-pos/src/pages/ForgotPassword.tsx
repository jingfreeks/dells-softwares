import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--color-brand)]">Tindahan POS</p>
        <h1 className="mt-1 text-xl font-semibold text-stone-900">Reset your password</h1>

        {sent ? (
          <p role="status" className="mt-4 text-sm text-stone-600">
            If an account exists for <span className="font-medium">{email}</span>, a reset link has
            been sent.
          </p>
        ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="resetEmail" className="text-sm font-medium text-stone-700">
                Email or phone
              </label>
              <input
                id="resetEmail"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-[var(--color-brand)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)]"
            >
              Send reset link
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-stone-600">
          <Link to="/login" className="font-medium text-[var(--color-brand)] hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
