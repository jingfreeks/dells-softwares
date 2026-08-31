import { useState } from "react";
import { useAuth } from "../../../../lib/auth";
import type { SignOutAllModalProps } from "./types";

export function useSignOutAllModal({ onClose }: SignOutAllModalProps) {
  const { signOutEverywhere } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const result = await signOutEverywhere();
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    // A global sign-out ends this session too, so AuthProvider's own
    // listener tears the screen down -- nothing left to close by hand.
    onClose();
  }

  return { submitting, error, submit };
}
