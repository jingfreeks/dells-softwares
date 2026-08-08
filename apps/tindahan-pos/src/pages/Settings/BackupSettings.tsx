import {
  PAGE_HEADING_BACKUP,
  TEXT_BACKUP_DESCRIPTION,
  LABEL_UNSAVED_CHANGES_CHIP,
  BUTTON_SAVE_CHANGES,
  BUTTON_DISCARD,
  TEXT_BACKUP_SETTINGS_UPDATED,
} from "@/lib";
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

    cloudBackupEnabled,
    toggleCloudBackupEnabled,
    frequency,
    setFrequency,
    wifiOnly,
    toggleWifiOnly,

    exportSalesCsv,
    exportProductsCsv,
    exportEverything,

    justSaved,
    isDirty,
    onSubmit,
    onDiscard,
  } = useBackupPage();

  return (
    <SettingsLayout>
      <form onSubmit={onSubmit} noValidate>
        <div className="tpl-hd">
          <div>
            <p className="tpl-h1" style={{ fontSize: 21 }}>
              {PAGE_HEADING_BACKUP}
            </p>
            <p className="tpl-sub">{TEXT_BACKUP_DESCRIPTION}</p>
          </div>
          {isDirty && <span className="tpl-chip tpl-w">{LABEL_UNSAVED_CHANGES_CHIP}</span>}
        </div>

        <SyncStatusCard
          salesCount={salesCount}
          productsCount={productsCount}
          customersCount={customersCount}
          refreshing={refreshing}
          onRefreshNow={onRefreshNow}
        />

        <div className="grid gap-3 sm:grid-cols-2" style={{ marginBottom: 11 }}>
          <AutomaticBackupCard
            cloudBackupEnabled={cloudBackupEnabled}
            onToggleCloudBackupEnabled={toggleCloudBackupEnabled}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            wifiOnly={wifiOnly}
            onToggleWifiOnly={toggleWifiOnly}
          />
          <OfflineQueueCard />
        </div>

        <ExportCard
          onExportSalesCsv={exportSalesCsv}
          onExportProductsCsv={exportProductsCsv}
          onExportEverything={exportEverything}
        />

        <RestoreNote />

        {justSaved && (
          <p role="status" className="tpl-ok" style={{ marginBottom: 14, fontSize: 13 }}>
            {TEXT_BACKUP_SETTINGS_UPDATED}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="submit"
            className="tpl-btnp w-full! sm:w-auto!"
            style={{ marginBottom: 0, whiteSpace: "nowrap" }}
            disabled={!isDirty}
          >
            {BUTTON_SAVE_CHANGES}
          </button>
          <button type="button" className="tpl-txt text-center sm:text-left" onClick={onDiscard}>
            {BUTTON_DISCARD}
          </button>
        </div>
      </form>
    </SettingsLayout>
  );
}
