import { useCallback, useEffect, useState } from "react";
import { supabase, ERROR_COULD_NOT_PAIR_DEVICE, ERROR_INVALID_OWNER_PIN, ERROR_COULD_NOT_UNPAIR_DEVICE } from "@/lib";

export interface DeviceRow {
  id: string;
  name: string;
  pairedByName: string;
  pairedAt: string;
  lastSeenAt: string | null;
  unpairedAt: string | null;
}

function friendlyUnpairError(message: string): string {
  if (message.includes("INVALID_OWNER_PIN")) return ERROR_INVALID_OWNER_PIN;
  return message || ERROR_COULD_NOT_UNPAIR_DEVICE;
}

export interface DeviceAllowance {
  cap: number;
  used: number;
  atLimit: boolean;
}

export function useDevicesPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [allowance, setAllowance] = useState<DeviceAllowance | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [unpairTargetId, setUnpairTargetId] = useState<string | null>(null);
  const [unpairPin, setUnpairPin] = useState("");
  const [unpairSubmitting, setUnpairSubmitting] = useState(false);
  const [unpairError, setUnpairError] = useState<string | null>(null);

  // Deliberately separate from fetchDevices. It is a nice-to-have count, and
  // an allowance that fails to load must cost the owner that count and
  // nothing else -- never the device list itself.
  //
  // Retired devices do not count here, the same rule the enforcement trigger
  // applies, so a store that has replaced a till is not judged on its history.
  const fetchAllowance = useCallback(async () => {
    try {
      const { data } = await supabase.rpc("my_store_limits");
      const row = (data ?? []).find(
        (r: { limit_key: string }) => r.limit_key === "devices"
      );
      setAllowance(
        row && row.cap !== null
          ? {
              cap: row.cap,
              used: row.current_usage ?? 0,
              atLimit: (row.current_usage ?? 0) >= row.cap,
            }
          : null
      );
    } catch {
      setAllowance(null);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [{ data: deviceRows, error: deviceError }, { data: staffRows }] = await Promise.all([
      supabase.from("devices").select("id, name, paired_by, paired_at, last_seen_at, unpaired_at"),
      supabase.from("staff").select("id, name"),
    ]);
    if (deviceError) {
      setLoadError(deviceError.message);
      setLoading(false);
      return;
    }
    const staffNameById = new Map((staffRows ?? []).map((row) => [row.id, row.name]));
    setDevices(
      (deviceRows ?? [])
        .filter((row) => !row.unpaired_at)
        .map((row) => ({
          id: row.id,
          name: row.name,
          pairedByName: staffNameById.get(row.paired_by) ?? "—",
          pairedAt: row.paired_at,
          lastSeenAt: row.last_seen_at,
          unpairedAt: row.unpaired_at,
        }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDevices();
    fetchAllowance();
  }, [fetchDevices, fetchAllowance]);

  async function generateCode() {
    setGenerating(true);
    setGenerateError(null);
    const { data, error } = await supabase.rpc("generate_pairing_code").single();
    setGenerating(false);
    if (error || !data) {
      setGenerateError(error?.message ?? ERROR_COULD_NOT_PAIR_DEVICE);
      return;
    }
    setGeneratedCode(data.code);
    setCodeExpiresAt(data.expires_at);
  }

  function dismissCode() {
    setGeneratedCode(null);
    setCodeExpiresAt(null);
  }

  function openUnpairModal(deviceId: string) {
    setUnpairTargetId(deviceId);
    setUnpairPin("");
    setUnpairError(null);
  }

  function closeUnpairModal() {
    setUnpairTargetId(null);
    setUnpairPin("");
    setUnpairError(null);
  }

  async function submitUnpair(pin: string) {
    if (!unpairTargetId) return;
    setUnpairSubmitting(true);
    setUnpairError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke("unpair-device", {
        body: { deviceId: unpairTargetId, ownerPin: pin },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      closeUnpairModal();
      await fetchDevices();
      await fetchAllowance();
    } catch (err) {
      setUnpairError(friendlyUnpairError(err instanceof Error ? err.message : ERROR_COULD_NOT_UNPAIR_DEVICE));
      setUnpairPin("");
    } finally {
      setUnpairSubmitting(false);
    }
  }

  return {
    devices,
    allowance,
    loading,
    loadError,
    generatedCode,
    codeExpiresAt,
    generating,
    generateError,
    generateCode,
    dismissCode,
    unpairTargetId,
    unpairPin,
    setUnpairPin,
    unpairSubmitting,
    unpairError,
    openUnpairModal,
    closeUnpairModal,
    submitUnpair,
  };
}
