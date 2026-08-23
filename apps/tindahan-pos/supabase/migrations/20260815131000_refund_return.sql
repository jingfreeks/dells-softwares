-- 20260815131000_refund_return.sql
--
-- BIR Compliance Audit, Phase 2b: refund/return. void_sale() is an
-- all-or-nothing reversal of a whole transaction -- there was no way to
-- return or refund part of a sale, forcing a real partial return outside
-- the system entirely.
--
-- Deliberately append-only, unlike void_sale()'s in-place status flip:
-- the original sales/sale_items rows are never touched (no status change,
-- no quantity mutation). A refund is new rows referencing the original
-- sale instead, since a sale can be partially refunded across more than
-- one event and there is no single "refunded" state to flip sales.status
-- to.

create table refunds (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  sale_id uuid not null references sales (id),
  actor_id uuid references staff (id),
  reason text not null,
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  created_at timestamptz not null default now()
);

create index refunds_sale_id_idx on refunds (sale_id, created_at desc);
create index refunds_store_id_idx on refunds (store_id, created_at desc);

-- store_id and sale_id are denormalized here (present on refunds already)
-- purely so RLS and "how much of this line has already been refunded"
-- queries never need a join -- same convention credit_overrides already
-- uses for cashier_id/approved_by alongside sale_id.
create table refund_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  refund_id uuid not null references refunds (id) on delete cascade,
  sale_id uuid not null references sales (id),
  sale_item_id uuid not null references sale_items (id),
  quantity integer not null check (quantity > 0),
  amount numeric(10, 2) not null check (amount >= 0)
);

create index refund_items_sale_item_id_idx on refund_items (sale_item_id);
create index refund_items_sale_id_idx on refund_items (sale_id);

alter table refunds enable row level security;
alter table refund_items enable row level security;

-- Same "admin-only, no client write policy" pattern as audit_log -- the
-- only way a row is created is inside refund_sale_items()'s own
-- transaction below, never forged or inserted directly.
create policy "admin can view store refunds"
  on refunds for select
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('pos.report.view')));

create policy "admin can view store refund items"
  on refund_items for select
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('pos.report.view')));

insert into permissions (code, module_code, description) values
  ('pos.sale.refund', 'pos', 'Refund or return part of a completed sale');

insert into role_permissions (role_id, permission_code)
  select r.id, p.code from roles r, permissions p
  where r.code = 'OWNER' and p.code = 'pos.sale.refund';
insert into role_permissions (role_id, permission_code)
  select r.id, p.code from roles r, permissions p
  where r.code = 'SUPERVISOR' and p.code = 'pos.sale.refund';

create function refund_sale_items(p_sale_id uuid, p_reason text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store_id uuid;
  v_sale sales%rowtype;
  v_reason text;
  v_item jsonb;
  v_sale_item sale_items%rowtype;
  v_already_refunded integer;
  v_qty integer;
  v_amount numeric(10, 2);
  v_total numeric(10, 2) := 0;
  v_refund_id uuid;
begin
  v_store_id := auth_store_id();
  if v_store_id is null then raise exception 'Not a registered staff member of any store'; end if;

  if not has_permission('pos.sale.refund') then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'REFUND_REASON_REQUIRED';
  end if;

  select * into v_sale from sales where id = p_sale_id and store_id = v_store_id for update;
  if not found then
    raise exception 'Sale not found in this store';
  end if;
  if v_sale.status = 'voided' then
    raise exception 'SALE_ALREADY_VOIDED';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'NO_ITEMS_TO_REFUND';
  end if;

  insert into refunds (store_id, sale_id, actor_id, reason, total_amount)
    values (v_store_id, p_sale_id, auth.uid(), v_reason, 0)
    returning id into v_refund_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_sale_item from sale_items
      where id = (v_item ->> 'sale_item_id')::uuid and sale_id = p_sale_id
      for update;
    if not found then
      raise exception 'Sale item not found on this sale';
    end if;
    if v_sale_item.item_type <> 'product' then
      raise exception 'ONLY_PRODUCT_LINES_REFUNDABLE';
    end if;

    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid refund quantity';
    end if;

    select coalesce(sum(quantity), 0) into v_already_refunded
      from refund_items where sale_item_id = v_sale_item.id;
    if v_already_refunded + v_qty > v_sale_item.quantity then
      raise exception 'REFUND_EXCEEDS_SOLD_QUANTITY: %', v_sale_item.name;
    end if;

    v_amount := round(v_sale_item.price * v_qty, 2);
    v_total := v_total + v_amount;

    insert into refund_items (store_id, refund_id, sale_id, sale_item_id, quantity, amount)
      values (v_store_id, v_refund_id, p_sale_id, v_sale_item.id, v_qty, v_amount);

    -- The product may have been deleted since the sale (sale_items.product_id
    -- is `on delete set null`) -- skip stock restoration gracefully, same
    -- tolerance void_sale() already has for this exact situation.
    if v_sale_item.product_id is not null then
      update products set stock = stock + v_qty, updated_at = now() where id = v_sale_item.product_id;
    end if;
  end loop;

  update refunds set total_amount = v_total where id = v_refund_id;

  -- Reverses the customer's utang balance by exactly the refunded amount --
  -- mirrors void_sale()'s reversal, scaled to a partial total instead of
  -- the whole sale.
  if v_sale.payment_type = 'credit' and v_sale.customer_id is not null then
    perform 1 from customers where id = v_sale.customer_id and store_id = v_store_id for update;
    update customers set balance = balance - v_total where id = v_sale.customer_id;
  end if;

  insert into audit_log (store_id, actor_id, action, entity_type, entity_id, new_value, reason)
    values (
      v_store_id, auth.uid(), 'sale_refunded', 'sale', p_sale_id,
      jsonb_build_object('refund_id', v_refund_id, 'total_amount', v_total, 'items', p_items),
      v_reason
    );

  return v_refund_id;
end;
$$;

revoke all on function refund_sale_items(uuid, text, jsonb) from public, anon, service_role;
grant execute on function refund_sale_items(uuid, text, jsonb) to authenticated;
