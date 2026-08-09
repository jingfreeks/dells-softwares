-- 0031_drop_stale_checkout_sale_overload.sql
--
-- 0030 used `create or replace function checkout_sale(...)` with 3 new
-- appended params, but Postgres treats a function's parameter list as part
-- of its identity — CREATE OR REPLACE only replaces a function with the
-- exact same signature. Since the new signature had a different arg count
-- (10 vs the previous 7), Postgres created a second, overloaded function
-- instead of replacing the old one, leaving both callable. That's an
-- ambiguity risk (PostgREST resolving an RPC call to the wrong overload)
-- and means the offline-support columns/idempotency/discrepancy logic in
-- 0030's version could be silently bypassed by any caller matching the old
-- 7-arg signature. Drop the stale 7-arg overload explicitly.

drop function if exists checkout_sale(
  p_items jsonb,
  p_services jsonb,
  p_customer_id uuid,
  p_payment_type text,
  p_reference_no text,
  p_override_pin text,
  p_cashier_token text
);
