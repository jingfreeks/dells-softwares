import { useState, type FormEvent } from "react";
import {
  supabase,
  ERROR_PASSWORD_TOO_SHORT,
  ERROR_PASSWORDS_DO_NOT_MATCH,
  ERROR_COULD_NOT_UPDATE_PASSWORD,
} from "@/lib";

const MIN_PASSWORD_LENGTH = 8;

export function useResetPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(ERROR_PASSWORD_TOO_SHORT);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(ERROR_PASSWORDS_DO_NOT_MATCH);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // The session here comes from the recovery link Supabase's client
      // establishes on page load (it parses the URL fragment itself) --
      // not from a normal signed-in visit. updateUser() works against
      // whatever session is currently active either way.
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) {
        setError(err.message || ERROR_COULD_NOT_UPDATE_PASSWORD);
        return;
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_COULD_NOT_UPDATE_PASSWORD);
    } finally {
      setSubmitting(false);
    }
  }

  return { newPassword, setNewPassword, confirmNewPassword, setConfirmNewPassword, error, submitting, saved, handleSubmit };
}
