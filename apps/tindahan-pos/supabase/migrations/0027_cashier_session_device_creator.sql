-- 0027_cashier_session_device_creator.sql
--
-- Bug fix found during Phase 3 (device pairing) browser verification:
-- cashier_sessions.created_by had a hard FK to staff(id), because at the
-- time it was written (0024, Phase 2) the only identity that could ever
-- call start_cashier_session() was a signed-in staff member. Phase 3
-- (0026) added a second identity — a paired device — that auth_store_id()
-- also resolves, and start_cashier_session() inserts created_by :=
-- auth.uid() unconditionally. A device has no staff row, so a device
-- starting a cashier session (the normal "tablet register, staff quick-
-- switch" case Phase 3 exists to support) hit
-- "cashier_sessions_created_by_fkey" and the whole session start failed.
--
-- Fix: created_by now means "the staff member OR paired device that
-- started this session" — drop the hard FK to staff (a plain uuid is
-- enough for audit purposes) rather than trying to satisfy two possible
-- parent tables. staff_id (the actual cashier who was picked and PIN-
-- verified) is unaffected and still references staff(id).
--
-- Rollback: alter table cashier_sessions add constraint
-- cashier_sessions_created_by_fkey foreign key (created_by) references
-- staff (id); -- (only safe if every created_by is still a staff id)

alter table cashier_sessions
  drop constraint cashier_sessions_created_by_fkey;
