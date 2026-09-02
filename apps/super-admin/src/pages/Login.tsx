import { useState, type FormEvent } from "react";
import { usePlatform } from "../lib/platform";
import { CenteredCard } from "../components/Shell";

export function Login() {
  const { signIn } = usePlatform();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    // Deliberately not "that account isn't an administrator" -- the sign-in
    // screen must not become an oracle for who holds platform access.
    if (!result.ok) setError("Incorrect email or password.");
  }

  return (
    <CenteredCard title="Sign in">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email" className="text-[12px] font-medium" style={{ color: "var(--t5)" }}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--bad)]"
            style={{ background: "var(--gl3)", borderColor: "var(--bd)", color: "var(--t1)" }}
          />
        </div>
        <div>
          <label htmlFor="password" className="text-[12px] font-medium" style={{ color: "var(--t5)" }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--bad)]"
            style={{ background: "var(--gl3)", borderColor: "var(--bd)", color: "var(--t1)" }}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg px-3 py-2 text-[13px]"
            style={{ background: "rgba(248,113,113,.10)", color: "var(--bad)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </CenteredCard>
  );
}
