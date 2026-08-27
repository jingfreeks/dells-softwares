import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { PairedDevice } from "./types";

export function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "Expired";
  const totalSeconds = Math.floor(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** All state + logic for SetupRegisterScreen -- SetupRegisterScreen.tsx stays presentational. */
export function useSetupRegisterScreen() {
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [msLeft, setMsLeft] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [unpairTarget, setUnpairTarget] = useState<PairedDevice | null>(null);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoadingDevices(true);
    setLoadError(null);
    const [{ data: deviceRows, error: deviceError }] = await Promise.all([
      supabase.from("devices").select("id, name, paired_at, last_seen_at, unpaired_at"),
    ]);
    if (deviceError) {
      setLoadError(deviceError.message);
      setLoadingDevices(false);
      return;
    }
    setDevices(
      (deviceRows ?? [])
        .filter((row) => !row.unpaired_at)
        .map((row) => ({ id: row.id, name: row.name, pairedAt: row.paired_at, lastSeenAt: row.last_seen_at }))
    );
    setLoadingDevices(false);
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    if (!expiresAt) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    function tick() {
      const left = new Date(expiresAt!).getTime() - Date.now();
      setMsLeft(left);
      if (left <= 0 && tickRef.current) {
        clearInterval(tickRef.current);
      }
    }
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [expiresAt]);

  async function generateCode() {
    setGenerating(true);
    setGenerateError(null);
    const { data, error } = await supabase.rpc("generate_pairing_code");
    setGenerating(false);
    const row = data?.[0];
    if (error || !row) {
      setGenerateError(error?.message ?? "Could not generate a code.");
      return;
    }
    setCode(row.code);
    setExpiresAt(row.expires_at);
  }

  return {
    devices,
    loadingDevices,
    loadError,
    code,
    msLeft,
    generating,
    generateError,
    generateCode,
    unpairTarget,
    openUnpairModal: setUnpairTarget,
    closeUnpairModal: () => setUnpairTarget(null),
    onDeviceUnpaired: fetchDevices,
  };
}
