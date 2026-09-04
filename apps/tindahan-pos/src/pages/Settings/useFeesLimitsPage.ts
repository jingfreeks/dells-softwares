import { useEffect, useState, type FormEvent } from "react";
import {
  useAuth,
  DEFAULT_ELOAD_FEE_BRACKETS,
  DEFAULT_CASH_IN_FEE_BRACKETS,
  DEFAULT_CASH_OUT_FEE_BRACKETS,
  type FeeBracket,
  ERROR_COULD_NOT_SAVE_FEES_AND_LIMITS, describePlatformError } from "@/lib";
import { loadFeesLimitsMock, saveFeesLimitsMock, DEFAULT_FEES_LIMITS_MOCK, type FeesLimitsMock } from "./feesLimitsMock";

type BracketKind = "eload" | "cashIn" | "cashOut";

function cloneBrackets(brackets: FeeBracket[]): FeeBracket[] {
  return brackets.map((b) => ({ ...b }));
}

interface FeeBracketsState {
  eload: FeeBracket[];
  cashIn: FeeBracket[];
  cashOut: FeeBracket[];
}

function bracketsFromStore(feeConfig: { eload?: FeeBracket[]; cashIn?: FeeBracket[]; cashOut?: FeeBracket[] } | null): FeeBracketsState {
  return {
    eload: cloneBrackets(feeConfig?.eload?.length ? feeConfig.eload : DEFAULT_ELOAD_FEE_BRACKETS),
    cashIn: cloneBrackets(feeConfig?.cashIn?.length ? feeConfig.cashIn : DEFAULT_CASH_IN_FEE_BRACKETS),
    cashOut: cloneBrackets(feeConfig?.cashOut?.length ? feeConfig.cashOut : DEFAULT_CASH_OUT_FEE_BRACKETS),
  };
}

export function useFeesLimitsPage() {
  const { user, store, updateStore } = useAuth();

  const [saved, setSaved] = useState<FeeBracketsState>(() => bracketsFromStore(store?.feeConfig ?? null));
  const [brackets, setBrackets] = useState<FeeBracketsState>(() => bracketsFromStore(store?.feeConfig ?? null));

  const [savedMock, setSavedMock] = useState<FeesLimitsMock>(DEFAULT_FEES_LIMITS_MOCK);
  const [mock, setMock] = useState<FeesLimitsMock>(DEFAULT_FEES_LIMITS_MOCK);

  // Real, server-enforced store columns (20260903190000/20260903200000) --
  // not part of FeesLimitsMock. 0 in the cap field means "no cap" in the UI
  // (matches the existing min={0} number input) and is submitted as
  // Postgres null, same convention as customers.credit_limit.
  const [savedVoidNeedsPin, setSavedVoidNeedsPin] = useState(store?.voidRequiresPin ?? false);
  const [voidNeedsPin, setVoidNeedsPin] = useState(store?.voidRequiresPin ?? false);
  const [savedCashierCashOutCap, setSavedCashierCashOutCap] = useState(store?.cashierCashOutCap ?? 0);
  const [cashierCashOutCap, setCashierCashOutCap] = useState(store?.cashierCashOutCap ?? 0);

  const [formError, setFormError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const next = bracketsFromStore(store?.feeConfig ?? null);
    setSaved(next);
    setBrackets(next);
  }, [store?.feeConfig]);

  useEffect(() => {
    setSavedVoidNeedsPin(store?.voidRequiresPin ?? false);
    setVoidNeedsPin(store?.voidRequiresPin ?? false);
  }, [store?.voidRequiresPin]);

  useEffect(() => {
    setSavedCashierCashOutCap(store?.cashierCashOutCap ?? 0);
    setCashierCashOutCap(store?.cashierCashOutCap ?? 0);
  }, [store?.cashierCashOutCap]);

  useEffect(() => {
    if (!user) return;
    const loaded = loadFeesLimitsMock(user.storeId);
    setSavedMock(loaded);
    setMock(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  function updateBracketFee(kind: BracketKind, index: number, fee: number) {
    setJustSaved(false);
    setBrackets((prev) => ({
      ...prev,
      [kind]: prev[kind].map((b, i) => (i === index ? { ...b, fee } : b)),
    }));
  }

  function updateBracketMax(kind: BracketKind, index: number, max: number) {
    setJustSaved(false);
    setBrackets((prev) => ({
      ...prev,
      [kind]: prev[kind].map((b, i) => (i === index ? { ...b, max } : b)),
    }));
  }

  function addBracket(kind: BracketKind) {
    setJustSaved(false);
    setBrackets((prev) => {
      const list = prev[kind];
      const last = list[list.length - 1];
      const nextMax = last ? last.max + 100 : 100;
      const nextFee = last ? last.fee : 0;
      return { ...prev, [kind]: [...list, { max: nextMax, fee: nextFee }] };
    });
  }

  function removeBracket(kind: BracketKind, index: number) {
    setJustSaved(false);
    setBrackets((prev) => ({
      ...prev,
      [kind]: prev[kind].filter((_, i) => i !== index),
    }));
  }

  function setMockField<K extends keyof FeesLimitsMock>(key: K, value: FeesLimitsMock[K]) {
    setJustSaved(false);
    setMock((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMockField(key: "blockUtangPastLimit" | "warnLowEloadFloat") {
    setJustSaved(false);
    setMock((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleVoidNeedsPin() {
    setJustSaved(false);
    setVoidNeedsPin((prev) => !prev);
  }

  function updateCashierCashOutCap(value: number) {
    setJustSaved(false);
    setCashierCashOutCap(value);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFormError(null);
    setJustSaved(false);
    try {
      const result = await updateStore({
        feeConfig: { eload: brackets.eload, cashIn: brackets.cashIn, cashOut: brackets.cashOut },
        voidRequiresPin: voidNeedsPin,
        cashierCashOutCap: cashierCashOutCap > 0 ? cashierCashOutCap : null,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      saveFeesLimitsMock(user.storeId, mock);
      setSavedMock(mock);
      setSaved(brackets);
      setSavedVoidNeedsPin(voidNeedsPin);
      setSavedCashierCashOutCap(cashierCashOutCap);
      setJustSaved(true);
    } catch (err) {
      setFormError(describePlatformError(err, ERROR_COULD_NOT_SAVE_FEES_AND_LIMITS));
    } finally {
      setSubmitting(false);
    }
  }

  function handleDiscard() {
    setBrackets(saved);
    setMock(savedMock);
    setVoidNeedsPin(savedVoidNeedsPin);
    setCashierCashOutCap(savedCashierCashOutCap);
    setFormError(null);
    setJustSaved(false);
  }

  const isDirty =
    JSON.stringify(brackets) !== JSON.stringify(saved) ||
    JSON.stringify(mock) !== JSON.stringify(savedMock) ||
    voidNeedsPin !== savedVoidNeedsPin ||
    cashierCashOutCap !== savedCashierCashOutCap;

  return {
    eloadBrackets: brackets.eload,
    cashInBrackets: brackets.cashIn,
    cashOutBrackets: brackets.cashOut,
    updateBracketFee,
    updateBracketMax,
    addBracket,
    removeBracket,
    mock,
    setMockField,
    toggleMockField,
    voidNeedsPin,
    toggleVoidNeedsPin,
    cashierCashOutCap,
    updateCashierCashOutCap,
    formError,
    justSaved,
    submitting,
    isDirty,
    onSubmit: handleSubmit,
    onDiscard: handleDiscard,
  };
}
