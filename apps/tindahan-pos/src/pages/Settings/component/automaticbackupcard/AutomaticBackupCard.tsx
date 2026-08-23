import { LABEL_AUTOMATIC_BACKUP, TEXT_AUTOMATIC_BACKUP_DESC } from "@/lib";

/** BIR compliance, Phase 5: real, scheduled backups run outside this app
 * (a GitHub Actions workflow, see scripts/backup-database.mjs) — nothing
 * here is configurable, so this is a static status card, not a settings
 * form. No live "last backup" status is shown: a dump contains every
 * store's data, and no tenant-scoped client read of that is safe. */
export function AutomaticBackupCard() {
  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_AUTOMATIC_BACKUP}
      </p>
      <p className="tpl-ts">{TEXT_AUTOMATIC_BACKUP_DESC}</p>
    </div>
  );
}
