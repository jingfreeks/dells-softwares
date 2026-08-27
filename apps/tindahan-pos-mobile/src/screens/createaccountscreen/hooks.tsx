import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from "../../lib/validation";
import type { CreateAccountScreenProps, TouchedFields } from "./types";

export const SEGMENTS = ["Sign in", "Create account"] as const;

/** All state + logic for CreateAccountScreen -- CreateAccountScreen.tsx stays presentational. */
export function useCreateAccountScreen({ onSwitchToSignIn }: CreateAccountScreenProps) {
  const { register } = useAuth();
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({
    storeName: false,
    ownerName: false,
    email: false,
    password: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  function markTouched(field: keyof TouchedFields) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleSegmentChange(segment: string) {
    if (segment === "Sign in") onSwitchToSignIn?.();
  }

  const storeNameError = touched.storeName && !storeName.trim() ? "Store name is required." : undefined;
  const ownerNameError = touched.ownerName && !ownerName.trim() ? "Your name is required." : undefined;
  const emailValid = isValidEmail(email);
  const emailError = touched.email && email.length > 0 && !emailValid ? "Enter a valid email address." : undefined;
  const passwordValid = isValidPassword(password);
  const passwordError =
    touched.password && password.length > 0 && !passwordValid
      ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      : undefined;

  const canSubmit = !submitting && !!storeName.trim() && !!ownerName.trim() && emailValid && passwordValid && agreed;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await register({ storeName, ownerName, email, password });
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setNeedsEmailConfirmation(true);
    }
    // Otherwise a session now exists; AuthProvider's onAuthStateChange
    // picks it up and the app navigates away from this screen on its own.
  }

  return {
    storeName,
    setStoreName,
    ownerName,
    setOwnerName,
    email,
    setEmail,
    password,
    setPassword,
    agreed,
    toggleAgreed: () => setAgreed((v) => !v),
    markTouched,
    handleSegmentChange,
    storeNameError,
    ownerNameError,
    emailValid,
    emailError,
    passwordError,
    canSubmit,
    submitting,
    submitError,
    needsEmailConfirmation,
    setNeedsEmailConfirmation,
    handleSubmit,
  };
}
