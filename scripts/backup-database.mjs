#!/usr/bin/env node
/**
 * BIR Compliance Audit, Phase 5: real automated backups for tindahan-pos.
 *
 * Dumps the production database (schema + data via pg_dump, roles via
 * pg_dumpall --roles-only, since roles aren't captured per-database) and
 * uploads both to a private Supabase Storage bucket, then deletes
 * anything under the same prefix older than the retention window.
 *
 * The retention window below is an operational/storage-cost default,
 * NOT the BIR-mandated statutory retention period for sales/audit
 * records -- that is a separate, still-unconfirmed Phase 5 item that
 * needs an accountant/BIR answer before it can be encoded anywhere.
 *
 * Required environment:
 *   DATABASE_URL                 direct Postgres connection string (not
 *                                 the REST API) -- pg_dump/pg_dumpall need
 *                                 this, and it is not obtainable via
 *                                 `supabase projects api-keys`. Pull it
 *                                 from the Supabase dashboard's
 *                                 Connection string page.
 *   SUPABASE_URL                 the project's REST URL (VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY    service_role key -- bypasses RLS, which
 *                                 is required here since the backups
 *                                 bucket has no client-facing policy at
 *                                 all (see 20260815135000_backups_bucket.sql)
 *
 * Usage: node scripts/backup-database.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const RETENTION_DAYS = 30;
const BUCKET = "backups";
const PREFIX = "production";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const databaseUrl = requireEnv("DATABASE_URL");
const supabaseUrl = requireEnv("SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const workDir = mkdtempSync(join(tmpdir(), "tindahan-backup-"));
const dumpPath = join(workDir, "backup.dump");
const rolesPath = join(workDir, "roles.sql");

try {
  console.log("Running pg_dump (schema + data, custom format)...");
  execFileSync("pg_dump", [databaseUrl, "-F", "c", "--no-owner", "--no-privileges", "-f", dumpPath], {
    stdio: "inherit",
  });

  console.log("Running pg_dumpall --roles-only...");
  // pg_dumpall, unlike pg_dump, doesn't accept a connection URI as a bare
  // positional argument -- it needs an explicit -d/--dbname.
  execFileSync("pg_dumpall", ["-d", databaseUrl, "--roles-only", "-f", rolesPath], { stdio: "inherit" });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dumpKey = `${PREFIX}/${timestamp}/backup.dump`;
  const rolesKey = `${PREFIX}/${timestamp}/roles.sql`;

  console.log(`Uploading to ${BUCKET}/${dumpKey}...`);
  const dumpUpload = await supabase.storage.from(BUCKET).upload(dumpKey, readFileSync(dumpPath), {
    contentType: "application/octet-stream",
  });
  if (dumpUpload.error) throw dumpUpload.error;

  console.log(`Uploading to ${BUCKET}/${rolesKey}...`);
  const rolesUpload = await supabase.storage.from(BUCKET).upload(rolesKey, readFileSync(rolesPath), {
    contentType: "text/plain",
  });
  if (rolesUpload.error) throw rolesUpload.error;

  console.log("Backup uploaded successfully.");

  console.log(`Applying ${RETENTION_DAYS}-day retention...`);
  const { data: entries, error: listError } = await supabase.storage.from(BUCKET).list(PREFIX);
  if (listError) throw listError;

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  // Each entry here is a "directory" named for its own timestamp (the
  // `${PREFIX}/${timestamp}/` folders created above, ISO 8601 with `:`/`.`
  // replaced by `-` since those aren't valid in a Storage object path) --
  // Storage's `list` has no recursive delete, so each stale folder's two
  // files are removed by name rather than by deleting the folder itself.
  const stale = entries.filter((entry) => {
    const match = entry.name.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
    if (!match) return false;
    const [, date, hh, mm, ss, ms] = match;
    const parsed = Date.parse(`${date}T${hh}:${mm}:${ss}.${ms}Z`);
    return !Number.isNaN(parsed) && parsed < cutoff;
  });

  if (stale.length > 0) {
    const pathsToRemove = stale.flatMap((entry) => [
      `${PREFIX}/${entry.name}/backup.dump`,
      `${PREFIX}/${entry.name}/roles.sql`,
    ]);
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(pathsToRemove);
    if (removeError) throw removeError;
    console.log(`Removed ${stale.length} backup(s) older than ${RETENTION_DAYS} days.`);
  } else {
    console.log("Nothing older than the retention window.");
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
