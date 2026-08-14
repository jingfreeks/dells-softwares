import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib";
import { supabase } from "@/lib/supabaseClient";
import {
  loadReceiptSettingsMock,
  saveReceiptSettingsMock,
  DEFAULT_RECEIPT_SETTINGS_MOCK,
  FOOTER_MESSAGE_MAX_LENGTH,
  type ReceiptSettingsMock,
} from "./receiptSettingsMock";
import { loadStoreDetailsMock } from "./storeDetailsMock";

type ToggleKey = Exclude<keyof ReceiptSettingsMock, "footerMessage">;

export function useReceiptsSettingsPage() {
  const { user, store } = useAuth();

  const [saved, setSaved] = useState<ReceiptSettingsMock>(DEFAULT_RECEIPT_SETTINGS_MOCK);
  const [settings, setSettings] = useState<ReceiptSettingsMock>(DEFAULT_RECEIPT_SETTINGS_MOCK);
  const [justSaved, setJustSaved] = useState(false);
  // The real, server-controlled next invoice number — read-only here, since
  // checkout_sale() is the only thing allowed to advance it. Null while
  // loading or if this store hasn't made its first sale yet (its
  // document_series row is created lazily on that first checkout).
  const [nextInvoiceNumberPreview, setNextInvoiceNumberPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const loaded = loadReceiptSettingsMock(user.storeId);
    setSaved(loaded);
    setSettings(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("document_series")
      .select("prefix, next_number")
      .eq("store_id", user.storeId)
      .eq("series_key", "default")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setNextInvoiceNumberPreview(
          data ? `${data.prefix}${String(data.next_number).padStart(6, "0")}` : "000001"
        );
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function toggle(key: ToggleKey) {
    setJustSaved(false);
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setFooterMessage(value: string) {
    setJustSaved(false);
    setSettings((prev) => ({ ...prev, footerMessage: value.slice(0, FOOTER_MESSAGE_MAX_LENGTH) }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    saveReceiptSettingsMock(user.storeId, settings);
    setSaved(settings);
    setJustSaved(true);
  }

  function handleDiscard() {
    setSettings(saved);
    setJustSaved(false);
  }

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved);
  const footerCharactersLeft = FOOTER_MESSAGE_MAX_LENGTH - settings.footerMessage.length;
  const tin = user ? loadStoreDetailsMock(user.storeId).tin : "";

  return {
    settings,
    toggle,
    setFooterMessage,
    footerCharactersLeft,
    nextInvoiceNumberPreview,
    isDirty,
    justSaved,
    onSubmit: handleSubmit,
    onDiscard: handleDiscard,
    store,
    tin,
  };
}
