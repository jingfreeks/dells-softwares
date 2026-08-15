import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, useCashierSession, useAuth, useDrawerFloat, ERROR_COULD_NOT_LOAD_STAFF } from "@/lib";
import { ERROR_INVALID_PIN, ERROR_PIN_LOCKED, ERROR_INACTIVE_EMPLOYEE, ERROR_INVALID_OPENING_FLOAT } from "@/lib";

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

export type CashierLoginStage = "picker" | "float" | "pin";

export function useCashierLoginScreen() {
  const { startCashierSession } = useCashierSession();
  const { balance: drawerBalance } = useDrawerFloat();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState<CashierPickerRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [stage, setStage] = useState<CashierLoginStage>("picker");
  const [openingFloat, setOpeningFloat] = useState("");
  const [openingFloatError, setOpeningFloatError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchStaffList = useCallback(async () => {
    setLoadingStaff(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase.rpc("list_pickable_cashiers");
      if (error) {
        setLoadError(ERROR_COULD_NOT_LOAD_STAFF);
      } else {
        setStaffList(
          (data ?? []).map((row) => ({ id: row.id, name: row.name, avatarUrl: row.avatar_url }))
        );
      }
    } catch {
      // A thrown network failure, not a normal RPC error response — without
      // this catch, `loadingStaff` would stay stuck `true` forever (an
      // indefinite "Loading staff…" message with no way to retry).
      setLoadError(ERROR_COULD_NOT_LOAD_STAFF);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  const selectedStaff = staffList.find((row) => row.id === selectedStaffId) ?? null;

  function selectStaff(staffId: string) {
    setSelectedStaffId(staffId);
    setOpeningFloat(drawerBalance > 0 ? String(drawerBalance) : "");
    setOpeningFloatError(null);
    setPin("");
    setPinError(null);
    setStage("float");
  }

  function backToPicker() {
    setSelectedStaffId(null);
    setPin("");
    setPinError(null);
    setStage("picker");
  }

  function backToFloat() {
    setPin("");
    setPinError(null);
    setStage("float");
  }

  function confirmFloat() {
    const parsed = Number(openingFloat);
    if (openingFloat.trim() === "" || Number.isNaN(parsed) || parsed < 0) {
      setOpeningFloatError(ERROR_INVALID_OPENING_FLOAT);
      return;
    }
    setOpeningFloatError(null);
    setStage("pin");
  }

  async function submitPin(enteredPin: string) {
    if (!selectedStaffId) return;
    setSubmitting(true);
    setPinError(null);
    const result = await startCashierSession(selectedStaffId, enteredPin, Number(openingFloat));
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
    retryLoadStaff: fetchStaffList,
    selectedStaff,
    selectStaff,
    backToPicker,
    stage,
    openingFloat,
    setOpeningFloat,
    openingFloatError,
    confirmFloat,
    backToFloat,
    pin,
    setPin,
    pinError,
    submitting,
    submitPin,
    signInWithEmailInstead,
    wrongStore,
  };
}
