import { PAGE_HEADING_BACKUP, TEXT_BACKUP_DESCRIPTION } from "@/lib";
import {
  SettingsLayout,
  SyncStatusCard,
  AutomaticBackupCard,
  OfflineQueueCard,
  ExportCard,
  RestoreNote,
} from "./component";
import { useBackupPage } from "./useBackupPage";

export function BackupSettings() {
  const {
    salesCount,
    productsCount,
    customersCount,
    refreshing,
    onRefreshNow,
    pendingCount,

    exportSalesCsv,
    exportProductsCsv,
    exportEverything,
  } = useBackupPage();

  return (
    <SettingsLayout>
      <div className="tpl-hd">
        <div>
          <p className="tpl-h1" style={{ fontSize: 21 }}>
            {PAGE_HEADING_BACKUP}
          </p>
          <p className="tpl-sub">{TEXT_BACKUP_DESCRIPTION}</p>
        </div>
      </div>

      <SyncStatusCard
        salesCount={salesCount}
        productsCount={productsCount}
        customersCount={customersCount}
        refreshing={refreshing}
        onRefreshNow={onRefreshNow}
        pendingCount={pendingCount}
      />

      <div className="grid gap-3 sm:grid-cols-2" style={{ marginBottom: 11 }}>
        <AutomaticBackupCard />
        <OfflineQueueCard />
      </div>

      <ExportCard
        onExportSalesCsv={exportSalesCsv}
        onExportProductsCsv={exportProductsCsv}
        onExportEverything={exportEverything}
      />

      <RestoreNote />
    </SettingsLayout>
  );
}
