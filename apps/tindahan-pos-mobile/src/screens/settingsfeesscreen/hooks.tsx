import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import {
  DEFAULT_CASH_IN_FEE_BRACKETS,
  DEFAULT_CASH_OUT_FEE_BRACKETS,
  DEFAULT_ELOAD_FEE_BRACKETS,
} from "../../lib/fees";
import {
  DEFAULT_FEES_LIMITS_MOCK,
  loadFeesLimitsMock,
  saveFeesLimitsMock,
  type FeesLimitsMock,
} from "../../lib/feesLimitsMock";
import type { FeeBracket, StoreFeeConfig } from "../../lib/types";
import type { BracketTableKey } from "./types";

type NumericKey = {
  [K in keyof FeesLimitsMock]: FeesLimitsMock[K] extends number ? K : never;
}[keyof FeesLimitsMock];
type BooleanKey = {
  [K in keyof FeesLimitsMock]: FeesLimitsMock[K] extends boolean ? K : never;
}[keyof FeesLimitsMock];

interface Brackets {
  eload: FeeBracket[];
  cashIn: FeeBracket[];
  cashOut: FeeBracket[];
}

function bracketsFromConfig(config: StoreFeeConfig | null): Brackets {
  // A store that has never edited its fees has fee_config null and is
  // charged the defaults, so seeding from anything else would show the
  // operator a number their register doesn't actually use.
  return {
    eload: [...(config?.eload?.length ? config.eload : DEFAULT_ELOAD_FEE_BRACKETS)],
    cashIn: [...(config?.cashIn?.length ? config.cashIn : DEFAULT_CASH_IN_FEE_BRACKETS)],
    cashOut: [...(config?.cashOut?.length ? config.cashOut : DEFAULT_CASH_OUT_FEE_BRACKETS)],
  };
}

/**
 * Everything behind mobile-settings-fees.html.
 *
 * Split down the middle, and the halves are genuinely different:
 *   - REAL: the three fee-bracket tables live in `stores.fee_config`, and
 *     the register prices every e-load/cash-in/cash-out sale from them.
 *     Editing these changes what customers are actually charged.
 *   - MOCK: print/photocopy pricing and the cash/credit limits have no
 *     column and no enforcement path on either client, so they persist to
 *     AsyncStorage exactly as the web app's feesLimitsMock does.
 *
 * A failed real save leaves the mock half unwritten, so the two can't
 * drift apart.
 */
export function useSettingsFeesScreen() {
  const { store, updateStore } = useAuth();

  const [brackets, setBrackets] = useState<Brackets>(() => bracketsFromConfig(null));
  const [storedBrackets, setStoredBrackets] = useState<Brackets>(() => bracketsFromConfig(null));
  const [limits, setLimits] = useState<FeesLimitsMock>(DEFAULT_FEES_LIMITS_MOCK);
  const [storedLimits, setStoredLimits] = useState<FeesLimitsMock>(DEFAULT_FEES_LIMITS_MOCK);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    const seeded = bracketsFromConfig(store.feeConfig);
    setBrackets(seeded);
    setStoredBrackets(seeded);
    loadFeesLimitsMock(store.id).then((loaded) => {
      if (cancelled) return;
      setLimits(loaded);
      setStoredLimits(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [store?.id]);

  const dirty =
    JSON.stringify(brackets) !== JSON.stringify(storedBrackets) ||
    JSON.stringify(limits) !== JSON.stringify(storedLimits);

  /** Digits only -- these are money/page counts typed on a number pad, and a cleared field means 0, never NaN. */
  function toNumber(value: string): number {
    const digits = value.replace(/\D/g, "");
    return digits === "" ? 0 : Number(digits);
  }

  function setBracketFee(table: BracketTableKey, index: number, value: string) {
    setBrackets((prev) => ({
      ...prev,
      [table]: prev[table].map((b, i) => (i === index ? { ...b, fee: toNumber(value) } : b)),
    }));
    setSaved(false);
  }

  function setBracketMax(table: BracketTableKey, index: number, value: string) {
    setBrackets((prev) => ({
      ...prev,
      [table]: prev[table].map((b, i) => (i === index ? { ...b, max: toNumber(value) } : b)),
    }));
    setSaved(false);
  }

  /** New bracket starts above the current top one, carrying its fee forward -- same shape the web app appends. */
  function addBracket(table: BracketTableKey) {
    setBrackets((prev) => {
      const rows = prev[table];
      const last = rows[rows.length - 1];
      return { ...prev, [table]: [...rows, { max: last.max + 100, fee: last.fee }] };
    });
    setSaved(false);
  }

  function removeBracket(table: BracketTableKey, index: number) {
    setBrackets((prev) => {
      // Never leave a table empty: an empty array falls back to the
      // defaults at checkout, which would silently undo the edit.
      if (prev[table].length <= 1) return prev;
      return { ...prev, [table]: prev[table].filter((_, i) => i !== index) };
    });
    setSaved(false);
  }

  function setLimitValue(key: NumericKey, value: string) {
    setLimits((prev) => ({ ...prev, [key]: toNumber(value) }));
    setSaved(false);
  }

  function toggleLimit(key: BooleanKey) {
    setLimits((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function handleDiscard() {
    setBrackets(storedBrackets);
    setLimits(storedLimits);
    setError(null);
    setSaved(false);
  }

  async function handleSave() {
    if (!store) return;
    // Ascending ceilings are what makes a bracket table resolvable at all
    // (feeFromBrackets walks it in order and returns the first match), so
    // a table that isn't ordered would silently misprice sales.
    for (const table of ["eload", "cashIn", "cashOut"] as const) {
      const rows = brackets[table];
      for (let i = 1; i < rows.length; i++) {
        if (rows[i].max <= rows[i - 1].max) {
          setError("Each bracket must end higher than the one above it.");
          return;
        }
      }
      if (rows.some((b) => b.fee < 0 || b.max <= 0)) {
        setError("Fees and amounts must be positive.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await updateStore({
        feeConfig: { eload: brackets.eload, cashIn: brackets.cashIn, cashOut: brackets.cashOut },
      });
      if (!result.ok) {
        // Keep the operator's edits -- they can fix and retry.
        setError(result.error);
        return;
      }
      await saveFeesLimitsMock(store.id, limits);
      setStoredBrackets(brackets);
      setStoredLimits(limits);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your fees.");
    } finally {
      setSaving(false);
    }
  }

  return {
    brackets,
    setBracketFee,
    setBracketMax,
    addBracket,
    removeBracket,
    limits,
    setLimitValue,
    toggleLimit,
    dirty,
    saving,
    error,
    saved,
    onSave: handleSave,
    onDiscard: handleDiscard,
  };
}
