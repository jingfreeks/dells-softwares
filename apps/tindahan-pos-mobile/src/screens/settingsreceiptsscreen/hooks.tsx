import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import {
  DEFAULT_RECEIPT_SETTINGS_MOCK,
  FOOTER_MESSAGE_MAX_LENGTH,
  loadReceiptSettingsMock,
  saveReceiptSettingsMock,
  type ReceiptSettingsMock,
} from "../../lib/receiptSettingsMock";
import { supabase } from "../../lib/supabaseClient";

type BooleanKey = {
  [K in keyof ReceiptSettingsMock]: ReceiptSettingsMock[K] extends boolean ? K : never;
}[keyof ReceiptSettingsMock];

/**
 * Everything behind mobile-settings-receipts.html.
 *
 * The toggles/chips/footer are AsyncStorage-only, mirroring the web app's
 * own receiptSettingsMock -- neither client has a receipt-printing or SMS
 * path for them to drive yet. The one real thing here is the next receipt
 * number, read from `document_series`: server-controlled, advanced only
 * by checkout_sale(), so it's shown read-only rather than as a field
 * someone could edit into a duplicate.
 */
export function useSettingsReceiptsScreen() {
  const { store } = useAuth();

  const [settings, setSettings] = useState<ReceiptSettingsMock>(DEFAULT_RECEIPT_SETTINGS_MOCK);
  const [storedSettings, setStoredSettings] = useState<ReceiptSettingsMock>(DEFAULT_RECEIPT_SETTINGS_MOCK);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /** Null while loading; the series row is created lazily on the store's first checkout. */
  const [nextReceiptNumber, setNextReceiptNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    loadReceiptSettingsMock(store.id).then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      setStoredSettings(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [store?.id]);

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    supabase
      .from("document_series")
      .select("prefix, next_number")
      .eq("store_id", store.id)
      .eq("series_key", "default")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        // No row yet means no sale has been rung up, so the next number
        // is the first one -- same fallback the web app shows.
        setNextReceiptNumber(data ? `${data.prefix}${String(data.next_number).padStart(6, "0")}` : "000001");
      });
    return () => {
      cancelled = true;
    };
  }, [store?.id]);

  const dirty = JSON.stringify(settings) !== JSON.stringify(storedSettings);

  function toggle(key: BooleanKey) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function setFooterMessage(value: string) {
    setSettings((prev) => ({ ...prev, footerMessage: value.slice(0, FOOTER_MESSAGE_MAX_LENGTH) }));
    setSaved(false);
  }

  function handleDiscard() {
    setSettings(storedSettings);
    setSaved(false);
  }

  async function handleSave() {
    if (!store) return;
    setSaving(true);
    await saveReceiptSettingsMock(store.id, settings);
    setStoredSettings(settings);
    setSaving(false);
    setSaved(true);
  }

  return {
    settings,
    toggle,
    setFooterMessage,
    footerCharsLeft: FOOTER_MESSAGE_MAX_LENGTH - settings.footerMessage.length,
    nextReceiptNumber,
    storeName: store?.name ?? "",
    dirty,
    saving,
    saved,
    onSave: handleSave,
    onDiscard: handleDiscard,
  };
}
