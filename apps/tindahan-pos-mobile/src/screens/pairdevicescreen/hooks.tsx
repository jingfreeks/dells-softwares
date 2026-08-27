import { useState } from "react";
import { useAuth } from "../../lib/auth";

/** All state + logic for PairDeviceScreen -- PairDeviceScreen.tsx stays presentational. */
export function usePairDeviceScreen() {
  const { pairDevice } = useAuth();
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCodeChange(value: string) {
    setCode(value.toUpperCase().slice(0, 6));
    setError(null);
  }

  async function handleSubmit() {
    if (code.trim().length !== 6 || !deviceName.trim()) {
      setError("Enter the 6-character code and a name for this device.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await pairDevice(code, deviceName);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
    }
    // On success, AuthProvider's own session listener picks up the new
    // signed-in device automatically -- Root() switches away from here.
  }

  return {
    code,
    handleCodeChange,
    deviceName,
    setDeviceName,
    submitting,
    error,
    handleSubmit,
  };
}
