import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { useCashierSession } from "../../lib/cashierSession";
import { supabase } from "../../lib/supabaseClient";
import type { PickableCashier } from "./types";

export const PIN_LENGTH = 4;
export const KEYPAD_ROWS: (string | null)[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [null, "0", "backspace"],
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function friendlyPinError(errorCode: string): string {
  if (errorCode.includes("INACTIVE_EMPLOYEE")) return "This staff member is no longer active.";
  if (errorCode.includes("PIN_LOCKED")) return "Too many wrong attempts. Try again in a few minutes.";
  if (errorCode.includes("INVALID_PIN")) return "That PIN is incorrect.";
  return errorCode;
}

/** All state + logic for the "Who's on the register?" PIN lock -- CashierPinScreen.tsx stays presentational. */
export function useCashierPinScreen() {
  const { store } = useAuth();
  const { startCashierSession, loading: startingSession } = useCashierSession();

  const [cashiers, setCashiers] = useState<PickableCashier[]>([]);
  const [loadingCashiers, setLoadingCashiers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<PickableCashier | null>(null);
  const [pin, setPin] = useState("");
  const [awaitingFloat, setAwaitingFloat] = useState(false);
  const [openingFloatText, setOpeningFloatText] = useState("0");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("list_pickable_cashiers").then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) {
        setLoadError(err.message);
      } else {
        setCashiers((data ?? []).map((row) => ({ id: row.id, name: row.name, avatarUrl: row.avatar_url })));
      }
      setLoadingCashiers(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function selectCashier(cashier: PickableCashier) {
    setSelected(cashier);
    setPin("");
    setAwaitingFloat(false);
    setError(null);
  }

  function pressDigit(digit: string) {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setError(null);
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setAwaitingFloat(true);
    }
  }

  function pressBackspace() {
    setAwaitingFloat(false);
    setPin((prev) => prev.slice(0, -1));
  }

  async function submitShiftStart() {
    if (!selected) return;
    const openingFloat = Number(openingFloatText);
    if (Number.isNaN(openingFloat) || openingFloat < 0) {
      setError("Enter a valid amount.");
      return;
    }
    const result = await startCashierSession(selected.id, pin, openingFloat);
    if (!result.ok) {
      setError(friendlyPinError(result.error));
      setPin("");
      setAwaitingFloat(false);
    }
  }

  return {
    store,
    startingSession,
    cashiers,
    loadingCashiers,
    loadError,
    selected,
    pin,
    awaitingFloat,
    openingFloatText,
    setOpeningFloatText,
    error,
    selectCashier,
    deselectCashier: () => setSelected(null),
    pressDigit,
    pressBackspace,
    goBackToPin: () => setAwaitingFloat(false),
    submitShiftStart,
  };
}
