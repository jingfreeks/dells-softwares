import { useState } from "react";
import { useAuth } from "../../../../lib/auth";
import type { ChangePasswordModalProps } from "./types";

/** Same minimum the web app enforces (Settings/hooks.tsx's MIN_PASSWORD_LENGTH). */
const MIN_PASSWORD_LENGTH = 8;

export function useChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { changePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await changePassword(password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setPassword("");
    setConfirmPassword("");
    onClose();
  }

  return { password, setPassword, confirmPassword, setConfirmPassword, submitting, error, saved, submit };
}
