import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib";
import {
  loadReceiptSettingsMock,
  saveReceiptSettingsMock,
  DEFAULT_RECEIPT_SETTINGS_MOCK,
  FOOTER_MESSAGE_MAX_LENGTH,
  type ReceiptSettingsMock,
} from "./receiptSettingsMock";
import { loadStoreDetailsMock } from "./storeDetailsMock";

type ToggleKey = Exclude<keyof ReceiptSettingsMock, "footerMessage" | "nextReceiptNumber">;

export function useReceiptsSettingsPage() {
  const { user, store } = useAuth();

  const [saved, setSaved] = useState<ReceiptSettingsMock>(DEFAULT_RECEIPT_SETTINGS_MOCK);
  const [settings, setSettings] = useState<ReceiptSettingsMock>(DEFAULT_RECEIPT_SETTINGS_MOCK);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loaded = loadReceiptSettingsMock(user.storeId);
    setSaved(loaded);
    setSettings(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  function toggle(key: ToggleKey) {
    setJustSaved(false);
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setFooterMessage(value: string) {
    setJustSaved(false);
    setSettings((prev) => ({ ...prev, footerMessage: value.slice(0, FOOTER_MESSAGE_MAX_LENGTH) }));
  }

  function setNextReceiptNumber(value: string) {
    setJustSaved(false);
    setSettings((prev) => ({ ...prev, nextReceiptNumber: value }));
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
    setNextReceiptNumber,
    isDirty,
    justSaved,
    onSubmit: handleSubmit,
    onDiscard: handleDiscard,
    store,
    tin,
  };
}
