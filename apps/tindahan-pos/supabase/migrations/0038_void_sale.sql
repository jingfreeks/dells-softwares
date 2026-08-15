-- 0038_void_sale.sql
--
-- BIR Compliance §39 "No Silent Modification of Issued Invoices" /
-- "Void / Cancelled Transactions": until now `sales` had no status column
-- at all, so a completed sale could never be voided/cancelled through the
-- app — any correction would have required directly editing or deleting
-- the row, which is exactly what the compliance doc prohibits. Issued
-- transactions must be treated as immutable/controlled records; a
-- correction must go through an explicit void workflow that preserves the
-- original row and records who did it, when, and why:
--
--   Invoice #000123
--   Status: VOIDED
--   Voided by: Admin
--   Voided date: 2026-08-14
--   Reason: Incorrect quantity
--
-- This migration adds that status/audit metadata directly to `sales` (so
-- the Reports page can show it without a join for the common case), plus
-- a generic `audit_log` table (so future sensitive actions — price
-- changes, tax config changes — don't need their own bespoke schema), and
-- a `void_sale()` RPC that is the *only* way `sales.status` can change:
-- it reverses the original sale's stock/customer-balance effects
-- atomically and writes both the denormalized fields on `sales` and a
-- structured `audit_log` entry in the same transaction.
--
-- The receipt/OR number itself is deliberately never touched or
-- recycled — a voided invoice number stays "used" forever, matching real
-- BIR invoicing practice and the existing document_series design.

alter table sales
  add column status text not null default 'completed' check (status in ('completed', 'voided')),
  add column voided_at timestamptz,
  add column voided_by uuid references staff (id),
  add column void_reason text;

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  actor_id uuid references staff (id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index audit_log_store_id_idx on audit_log (store_id, created_at desc);

alter table audit_log enable row level security;

-- Same "admin-only, no client write policy" pattern as credit_overrides /
-- stock_discrepancies — the only way a row is created is inside a
-- SECURITY DEFINER function's own transaction (void_sale() today, future
-- sensitive-action RPCs later), never forged or inserted directly.
create policy "admin can view own store audit log"
  on audit_log for select
  using (store_id = auth_store_id() and auth_role() = 'admin');

create function void_sale(p_sale_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store_id uuid;
  v_sale sales%rowtype;
  v_reason text;
  v_item record;
begin
  v_store_id := auth_store_id();
  if v_store_id is null then raise exception 'Not a registered staff member of any store'; end if;

  if auth_role() <> 'admin' then
    raise exception 'ADMIN_ONLY';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'VOID_REASON_REQUIRED';
  end if;

  select * into v_sale from sales where id = p_sale_id and store_id = v_store_id for update;
  if not found then
    raise exception 'Sale not found in this store';
  end if;
  if v_sale.status = 'voided' then
    raise exception 'ALREADY_VOIDED';
  end if;

  -- Restore stock for every product line item. A product can have been
  -- deleted since the sale (sale_items.product_id is `on delete set
  -- null`, see 0001_init.sql) — skip those gracefully, same tolerance
  -- checkout_sale() itself has for a since-deleted product.
  for v_item in
    select product_id, quantity from sale_items
      where sale_id = p_sale_id and item_type = 'product' and product_id is not null
  loop
    update products set stock = stock + v_item.quantity, updated_at = now()
      where id = v_item.product_id;
  end loop;

  -- Reverse the customer's utang balance for a credit sale — mirrors
  -- checkout_sale()'s `balance = balance + v_total` exactly in reverse.
  if v_sale.payment_type = 'credit' and v_sale.customer_id is not null then
    perform 1 from customers where id = v_sale.customer_id and store_id = v_store_id for update;
    update customers set balance = balance - v_sale.total where id = v_sale.customer_id;
  end if;

  update sales
    set status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = v_reason
    where id = p_sale_id;

  insert into audit_log (store_id, actor_id, action, entity_type, entity_id, previous_value, new_value, reason)
    values (
      v_store_id, auth.uid(), 'sale_voided', 'sale', p_sale_id,
      jsonb_build_object('status', 'completed'),
      jsonb_build_object('status', 'voided'),
      v_reason
    );
end;
$$;

revoke all on function void_sale(uuid, text) from public;
grant execute on function void_sale(uuid, text) to authenticated;
