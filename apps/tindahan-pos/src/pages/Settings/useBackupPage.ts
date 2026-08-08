import { useEffect, useState, type FormEvent } from "react";
import { useAuth, useStoreData, productsToCsv, salesToCsv, everythingToJson, downloadTextFile } from "@/lib";
import { loadBackupMock, saveBackupMock, DEFAULT_BACKUP_MOCK, type BackupMock, type BackupFrequency } from "./backupMock";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useBackupPage() {
  const { user } = useAuth();
  const { products, sales, customers, refresh } = useStoreData();

  const [saved, setSaved] = useState<BackupMock>(DEFAULT_BACKUP_MOCK);
  const [settings, setSettings] = useState<BackupMock>(DEFAULT_BACKUP_MOCK);
  const [refreshing, setRefreshing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loaded = loadBackupMock(user.storeId);
    setSaved(loaded);
    setSettings(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  function toggleCloudBackupEnabled() {
    setJustSaved(false);
    setSettings((prev) => ({ ...prev, cloudBackupEnabled: !prev.cloudBackupEnabled }));
  }

  function setFrequency(frequency: BackupFrequency) {
    setJustSaved(false);
    setSettings((prev) => ({ ...prev, frequency }));
  }

  function toggleWifiOnly() {
    setJustSaved(false);
    setSettings((prev) => ({ ...prev, wifiOnly: !prev.wifiOnly }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    saveBackupMock(user.storeId, settings);
    setSaved(settings);
    setJustSaved(true);
  }

  function handleDiscard() {
    setSettings(saved);
    setJustSaved(false);
  }

  async function handleRefreshNow() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  function exportSalesCsv() {
    downloadTextFile(`sales-${today()}.csv`, salesToCsv(sales), "text/csv");
  }

  function exportProductsCsv() {
    downloadTextFile(`products-${today()}.csv`, productsToCsv(products), "text/csv");
  }

  function exportEverything() {
    downloadTextFile(`backup-${today()}.json`, everythingToJson({ products, sales, customers }), "application/json");
  }

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved);

  return {
    salesCount: sales.length,
    productsCount: products.length,
    customersCount: customers.length,
    refreshing,
    onRefreshNow: handleRefreshNow,

    cloudBackupEnabled: settings.cloudBackupEnabled,
    toggleCloudBackupEnabled,
    frequency: settings.frequency,
    setFrequency,
    wifiOnly: settings.wifiOnly,
    toggleWifiOnly,

    exportSalesCsv,
    exportProductsCsv,
    exportEverything,

    justSaved,
    isDirty,
    onSubmit: handleSubmit,
    onDiscard: handleDiscard,
  };
}
