import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { isValidEmail } from "../../lib/validation";
import type { LoginScreenProps } from "./types";

export const SEGMENTS = ["Sign in", "Create account"] as const;

/** All state + logic for LoginScreen -- LoginScreen.tsx stays presentational. */
export function useLoginScreen({ onSwitchToCreateAccount }: LoginScreenProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailError =
    emailTouched && email.length > 0 && !isValidEmail(email) ? "Enter a valid email address." : undefined;

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setEmailTouched(true);
    if (!isValidEmail(email)) return;
    setSubmitting(true);
    setError(null);
    const result = await login(email, password, keepSignedIn);
    if (!result.ok) setError(result.error);
    setSubmitting(false);
  }

  function handleSegmentChange(segment: string) {
    if (segment === "Create account") onSwitchToCreateAccount?.();
  }

  const canSubmit = !submitting && isValidEmail(email) && !!password;

  return {
    email,
    setEmail,
    password,
    setPassword,
    keepSignedIn,
    toggleKeepSignedIn: () => setKeepSignedIn((v) => !v),
    submitting,
    error,
    emailError,
    markEmailTouched: () => setEmailTouched(true),
    handleSubmit,
    handleSegmentChange,
    canSubmit,
  };
}
