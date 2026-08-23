-- 20260815135000_backups_bucket.sql
--
-- BIR Compliance Audit, Phase 5: real automated backups. A private
-- Storage bucket for scheduled pg_dump/pg_dumpall output, written by the
-- new backup-production.yml GitHub Actions workflow via a service_role
-- key (which bypasses RLS entirely).
--
-- Deliberately no RLS policy for authenticated or anon -- deny-all is
-- correct here, the same "RLS enabled, no policy, only a privileged path
-- can touch it" convention this repo already uses for tables like
-- device_pairing_codes. A dump contains every store's data, so no
-- tenant-scoped client should ever be able to read this bucket's
-- contents.

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;
