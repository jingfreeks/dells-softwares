# Backups and restore

Real, scheduled backups of the production database — see the BIR Compliance
Audit's "Phase 5" entry in `docs/bir-compliance-readiness.md` for why this
exists (it replaces a set of manual, unscripted `pg_dump` runs and an in-app
"Automatic backup" toggle that never actually did anything).

## What's backed up, and where

- **Schedule**: daily, 19:00 UTC (`.github/workflows/backup-production.yml`).
  Can also be run on demand from the Actions tab (`workflow_dispatch`).
- **Scope**: production only — staging holds disposable test data.
- **Contents**: a full `pg_dump` (schema + data, custom format, `-F c`) plus
  a separate `pg_dumpall --roles-only` (roles aren't captured by a
  per-database dump).
- **Storage**: a private Supabase Storage bucket named `backups`
  (`supabase/migrations/20260815135000_backups_bucket.sql`), under
  `production/<ISO-timestamp>/`. No RLS policy grants `authenticated` or
  `anon` any access — only the workflow's `service_role` key (which bypasses
  RLS) can read or write it, since a dump contains every store's data.
- **Retention**: 30 days, enforced by the same script after each successful
  upload. This is an **operational/storage-cost default**, not the
  taxpayer's statutory record-retention period — that figure still needs
  confirmation from an accountant/BIR (tracked as a separate, unresolved
  item in `docs/bir-compliance-readiness.md`). Change `RETENTION_DAYS` in
  `scripts/backup-database.mjs` once that's confirmed.

## One-time setup (required before the workflow can run)

Three repo secrets are needed. Add each under **Settings → Secrets and
variables → Actions → New repository secret**.

**`TINDAHAN_SUPABASE_DB_URL`** — production's Postgres connection string,
which nothing else in this repo stores (the CLI's `supabase projects
api-keys` only returns the REST API keys, not this):

1. Supabase dashboard → the production project → **Connect** → **Connection
   string**. Switch to the **Session pooler** tab specifically — not
   "Direct connection" (that hostname is IPv6-only and unreachable from
   GitHub's runners, confirmed the hard way) and not "Transaction pooler"
   (that mode doesn't support the session-level features `pg_dump`/
   `pg_dumpall` need). Copy the URI and fill in the real database password.

**`TINDAHAN_PROD_SUPABASE_URL`** and **`TINDAHAN_PROD_SUPABASE_SERVICE_ROLE_KEY`**
— production's REST URL and service_role key, used to upload into the
`backups` Storage bucket:

2. Supabase dashboard → the production project → **Project Settings → API**.
   Copy the **Project URL** and the **service_role** secret key.

Deliberately **not** the existing `TINDAHAN_SUPABASE_URL`/
`TINDAHAN_SUPABASE_SERVICE_ROLE_KEY` secrets — despite the name, those are
**staging** credentials (`tindahan-pos-ci.yml`'s own header comment says so;
used for e2e tests). This was tried first and confirmed the hard way: the
dump itself was genuinely production's data (via `TINDAHAN_SUPABASE_DB_URL`
above), but it uploaded into staging's `backups` bucket instead of
production's, since the Storage client was built from staging's URL/key.

Also confirmed the hard way: `workflow_dispatch` and `schedule` triggers
only fire for a workflow file that exists on the repo's actual GitHub
default branch (`main` here) — a workflow that only exists on `dev` is
invisible to `gh workflow run`/the Actions "Run workflow" button and its
cron never fires, even though the file is present and correct.

## Restoring from a backup

There is no in-app restore — the "Restore" control in Settings → Backup is
deliberately inert (`RestoreNote.tsx`). Restoring is an operator action,
run directly against the target database:

1. Download the backup files from the `backups` bucket (Supabase Studio →
   Storage → `backups`, or `supabase storage` CLI commands) — you'll need
   `production/<timestamp>/backup.dump` and `.../roles.sql`.
2. Restore roles first, if restoring into a database that doesn't already
   have them:
   ```bash
   psql "$DATABASE_URL" -f roles.sql
   ```
3. Restore the schema + data:
   ```bash
   pg_restore --clean --if-exists --no-owner --no-privileges \
     -d "$DATABASE_URL" backup.dump
   ```
   `--clean --if-exists` drops existing objects before recreating them —
   confirm you actually want to overwrite the target database before
   running this. Restoring into a fresh, empty database (rather than over
   a live one) is almost always what you want for verification.

## Verifying a backup works

Periodically restore a backup into a fresh local Supabase stack
(`supabase start` in `apps/tindahan-pos`, never the shared staging/production
project) and confirm the app can read from it — a backup that has never been
test-restored is not a verified backup.
