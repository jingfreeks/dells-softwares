import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, useCashierSession, useAuth, ERROR_COULD_NOT_LOAD_STAFF } from "@/lib";
import { ERROR_INVALID_PIN, ERROR_PIN_LOCKED, ERROR_INACTIVE_EMPLOYEE } from "@/lib";

export interface CashierPickerRow {
  id: string;
  name: string;
  avatarUrl: string | null;
}

function friendlyStartSessionError(message: string): string {
  if (message.includes("INACTIVE_EMPLOYEE")) return ERROR_INACTIVE_EMPLOYEE;
  if (message.includes("PIN_LOCKED")) return ERROR_PIN_LOCKED;
  if (message.includes("INVALID_PIN")) return ERROR_INVALID_PIN;
  return message;
}

export function useCashierLoginScreen() {
  const { startCashierSession } = useCashierSession();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState<CashierPickerRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchStaffList = useCallback(async () => {
    setLoadingStaff(true);
    setLoadError(null);
    const { data, error } = await supabase.rpc("list_pickable_cashiers");
    if (error) {
      setLoadError(ERROR_COULD_NOT_LOAD_STAFF);
    } else {
      setStaffList(
        (data ?? []).map((row) => ({ id: row.id, name: row.name, avatarUrl: row.avatar_url }))
      );
    }
    setLoadingStaff(false);
  }, []);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  const selectedStaff = staffList.find((row) => row.id === selectedStaffId) ?? null;

  function selectStaff(staffId: string) {
    setSelectedStaffId(staffId);
    setPin("");
    setPinError(null);
  }

  function backToPicker() {
    setSelectedStaffId(null);
    setPin("");
    setPinError(null);
  }

  async function submitPin(enteredPin: string) {
    if (!selectedStaffId) return;
    setSubmitting(true);
    setPinError(null);
    const result = await startCashierSession(selectedStaffId, enteredPin);
    setSubmitting(false);
    if (!result.ok) {
      setPinError(friendlyStartSessionError(result.error));
      setPin("");
      return;
    }
  }

  async function signInWithEmailInstead() {
    await logout();
  }

  // "Wrong store?" (paired devices only): this device was paired to the
  // wrong store — sign out of its current session and go re-redeem a new
  // pairing code, rather than making anyone reinstall the app. No PIN
  // required — no cashier has signed in yet, nothing sensitive has
  // happened. The old `devices` row is left paired-but-abandoned until an
  // admin notices and unpairs it from Settings.
  async function wrongStore() {
    await logout();
    navigate("/pair");
  }

  return {
    staffList,
    loadingStaff,
    loadError,
    selectedStaff,
    selectStaff,
    backToPicker,
    pin,
    setPin,
    pinError,
    submitting,
    submitPin,
    signInWithEmailInstead,
    wrongStore,
  };
}
