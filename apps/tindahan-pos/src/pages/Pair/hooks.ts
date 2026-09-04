import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  supabase,
  ERROR_INVALID_OR_EXPIRED_CODE,
  ERROR_COULD_NOT_PAIR_DEVICE,
  describePlatformError,
} from "@/lib";

function friendlyPairError(message: string): string {
  if (message.includes("INVALID_OR_EXPIRED_CODE")) return ERROR_INVALID_OR_EXPIRED_CODE;
  // The register limit arrives here as the raw trigger text, forwarded by the
  // pair-device function. Anything it does not recognise is returned as-is,
  // so this stays a translation rather than a filter.
  return describePlatformError(message, ERROR_COULD_NOT_PAIR_DEVICE);
}

export function usePairPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCodeChange(value: string) {
    setCode(value.toUpperCase().slice(0, 6));
    setError(null);
  }

  async function submitPairing(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length !== 6 || !deviceName.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("pair-device", {
        body: { code: code.trim(), deviceName: deviceName.trim() },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      const { email, password } = data as { email: string; password: string };
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      navigate("/pos", { replace: true });
    } catch (err) {
      setError(friendlyPairError(describePlatformError(err, ERROR_COULD_NOT_PAIR_DEVICE)));
    } finally {
      setSubmitting(false);
    }
  }

  return {
    code,
    handleCodeChange,
    deviceName,
    setDeviceName,
    submitting,
    error,
    submitPairing,
  };
}
