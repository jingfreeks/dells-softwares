import { useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import type { UnpairModalProps } from "./types";

/** All state + logic for UnpairModal -- UnpairModal.tsx stays presentational. */
export function useUnpairModal({ device, onClose, onUnpaired }: UnpairModalProps) {
  const [ownerPin, setOwnerPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitUnpair() {
    if (ownerPin.trim().length !== 4) {
      setError("Enter your 4-digit PIN.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error: invokeError } = await supabase.functions.invoke("unpair-device", {
        body: { deviceId: device.id, ownerPin: ownerPin.trim() },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      onClose();
      await onUnpaired();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not unpair this device.";
      setError(message.includes("INVALID_OWNER_PIN") ? "That PIN is incorrect." : message);
    } finally {
      setSubmitting(false);
    }
  }

  return { ownerPin, setOwnerPin, submitting, error, submitUnpair };
}
