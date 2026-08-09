-- Tindahan POS — subscription plan data model + two enforced gates
--
-- No payment gateway — plan is manually assigned per the Alpha audit's own
-- recommendation ("track plan manually per customer"). This migration only
-- adds the `plan` column and enforces what the Tindahan tier (₱499/mo)
-- actually includes vs. what it doesn't:
--   * Reports capped to a 7-day lookback (Convenience+ gets full history).
--   * Device pairing capped at 1 active device (Convenience gets up to 3).
-- Both gates are enforced server-side (RLS / SECURITY DEFINER RPC), not
-- just in the UI — matching this schema's existing "never trust the
-- client" posture (see checkout_sale's own comment in 0001_init.sql).

-- ---------------------------------------------------------------------------
-- plan column
-- ---------------------------------------------------------------------------

alter table stores
  add column plan text not null default 'free_trial'
  check (plan in ('free_trial', 'tindahan', 'convenience', 'super_market'));

-- ---------------------------------------------------------------------------
-- Lock `plan` against client-driven changes.
--
-- The existing "admin can update own store" policy (0001_init.sql) has no
-- column-level restriction — without this trigger, any admin could set
-- their own store to 'super_market' via a direct client update. RLS
-- policies can't compare OLD vs. NEW in a single USING/WITH CHECK clause,
-- so a BEFORE UPDATE trigger is the correct enforcement point: it silently
-- keeps whatever plan the row already had unless the change came from a
-- service_role session (Studio/SQL editor/an admin script) — the only
-- place a plan is meant to change, per the audit's "manually assigned"
-- design.
-- ---------------------------------------------------------------------------

create or replace function _lock_store_plan()
returns trigger
language plpgsql
as $$
begin
  if new.plan is distinct from old.plan and auth.role() <> 'service_role' then
    new.plan := old.plan;
  end if;
  return new;
end;
$$;

create trigger lock_store_plan
  before update on stores
  for each row
  execute function _lock_store_plan();

-- ---------------------------------------------------------------------------
-- Reports gate: a tindahan-plan store's sales/sale_items rows older than
-- 7 days are simply invisible at the RLS layer, regardless of what date
-- range a client query asks for. Other plans are unaffected.
-- ---------------------------------------------------------------------------

drop policy "admin can view store sales" on sales;
create policy "admin can view store sales"
  on sales for select
  using (
    store_id = auth_store_id()
    and auth_role() = 'admin'
    and (
      created_at >= now() - interval '7 days'
      or (select plan from stores where id = sales.store_id) <> 'tindahan'
    )
  );

drop policy "admin can view store sale items" on sale_items;
create policy "admin can view store sale items"
  on sale_items for select
  using (
    exists (
      select 1 from sales
      where sales.id = sale_items.sale_id
        and sales.store_id = auth_store_id()
        and auth_role() = 'admin'
        and (
          sales.created_at >= now() - interval '7 days'
          or (select plan from stores where id = sales.store_id) <> 'tindahan'
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Device pairing gate: a tindahan-plan store can't generate a new pairing
-- code once it already has 1 active (non-unpaired) device. Fails fast,
-- before a code even exists, so a second tablet never gets far enough to
-- try redeeming one.
-- ---------------------------------------------------------------------------

create or replace function generate_pairing_code()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store_id uuid := auth_store_id();
  v_plan text;
  v_device_count int;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- excludes 0/O/1/I/L
  v_code text := '';
  v_expires_at timestamptz;
  i int;
begin
  if v_store_id is null or auth_role() <> 'admin' then
    raise exception 'Only an admin can generate a pairing code';
  end if;

  select plan into v_plan from stores where id = v_store_id;
  if v_plan = 'tindahan' then
    select count(*) into v_device_count
      from devices where store_id = v_store_id and unpaired_at is null;
    if v_device_count >= 1 then
      raise exception 'DEVICE_LIMIT_REACHED';
    end if;
  end if;

  for i in 1..6 loop
    v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  end loop;

  v_expires_at := now() + interval '10 minutes';

  insert into device_pairing_codes (store_id, code_hash, created_by, expires_at)
    values (v_store_id, crypt(v_code, gen_salt('bf')), auth.uid(), v_expires_at);

  return query select v_code, v_expires_at;
end;
$$;

revoke all on function generate_pairing_code() from public;
grant execute on function generate_pairing_code() to authenticated;
