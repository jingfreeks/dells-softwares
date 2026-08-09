-- 0030_offline_checkout_support.sql
--
-- Offline POS support: a sale attempted while the device has no connectivity
-- is queued locally and replayed once back online. This migration adds what
-- checkout_sale() needs to make that replay safe:
--
--   * client_request_id — an idempotency key. Replaying the same queued sale
--     (e.g. the client retries after a flaky reconnect) must not insert a
--     second sale or double-decrement stock.
--   * occurred_at — the sale's real, client-observed time. A sale queued
--     offline and replayed hours later must not appear to have happened at
--     sync time. created_at (server insert time) stays authoritative for any
--     server-side date-range/ordering logic; occurred_at is what the client
--     shows/reports as "when this sale happened".
--   * is_offline_replay — lets a replayed sale oversell (see below) instead
--     of being rejected, since the sale already happened physically (the
--     customer paid and left with goods) before the register knew stock had
--     run out from under it on another device.
--
-- Stock oversell policy for offline replay:
-- Live checkout keeps today's exact behavior — insufficient stock rejects
-- the whole sale. A replayed offline sale is different: blocking it would
-- mean money already collected from a real customer never gets recorded.
-- Instead it's always recorded, stock is allowed to go negative, and the
-- deficit is logged to stock_discrepancies for a manual recount later.
--
-- This requires moving the stock >= 0 guarantee out of a table CHECK
-- constraint (which can't be conditionally bypassed per calling code path —
-- CHECK constraints aren't deferrable) and into checkout_sale()'s own
-- application logic, branched on p_is_offline_replay. Audited before this
-- migration: the only other code paths that decrement products.stock are
-- transfer_warehouse_stock() (0019_warehouse_transfers.sql, already
-- self-validates with "if v_from_stock < p_quantity then raise exception"
-- before decrementing) and the client's restock()/quick-restock actions
-- (storeData.tsx, Inventory/hooks.tsx — both only ever add positive
-- quantities). Neither relies on the table CHECK for correctness, so
-- dropping it only removes protection checkout_sale() must now provide
-- itself for the live path — which it already did before this migration.

alter table sales add column client_request_id uuid;
create unique index sales_client_request_id_key
  on sales (client_request_id)
  where client_request_id is not null;

alter table sales add column occurred_at timestamptz;
alter table sales add column is_offline_replay boolean not null default false;

alter table products drop constraint products_stock_check;

create table stock_discrepancies (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  sale_id uuid not null references sales (id) on delete cascade,
  deficit integer not null check (deficit > 0),
  created_at timestamptz not null default now()
);

create index stock_discrepancies_store_id_idx on stock_discrepancies (store_id, created_at desc);

alter table stock_discrepancies enable row level security;

-- Same "admin-only, no client INSERT policy" pattern as credit_overrides —
-- the only way a row is created is inside checkout_sale()'s own offline-
-- replay branch, never forged or inserted directly by a client.
create policy "admin can view store stock discrepancies"
  on stock_discrepancies for select
  using (store_id = auth_store_id() and auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- checkout_sale: adds p_client_request_id / p_occurred_at / p_is_offline_replay
-- (appended, all defaulted, so no existing call site is affected). Nothing
-- else in the function body changes — same validation, same credit-limit/
-- override logic, same pack pricing, same service-line handling as 0028.
-- ---------------------------------------------------------------------------

create or replace function checkout_sale(
  p_items jsonb,
  p_services jsonb default '[]'::jsonb,
  p_customer_id uuid default null,
  p_payment_type text default 'cash',
  p_reference_no text default null,
  p_override_pin text default null,
  p_cashier_token text default null,
  p_client_request_id uuid default null,
  p_occurred_at timestamptz default null,
  p_is_offline_replay boolean default false
)
returns table (sale_id uuid, total numeric)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store_id uuid;
  v_cashier_id uuid := auth.uid();
  v_sale_id uuid;
  v_total numeric(10, 2) := 0;
  v_item jsonb;
  v_product products%rowtype;
  v_customer customers%rowtype;
  v_qty integer;
  v_amount numeric(10, 2);
  v_fee numeric(10, 2);
  v_label text;
  v_line_total numeric(10, 2);
  v_unit_price numeric(10, 2);
  v_computed jsonb := '[]'::jsonb;
  v_computed_item jsonb;
  v_pack_pricing_enabled boolean;
  v_seen_product_ids uuid[] := '{}';
  v_product_id uuid;
  v_reference_no text;
  v_insufficient_stock text[] := '{}';
  v_max_service_amount constant numeric := 50000;
  v_projected_balance numeric(10, 2);
  v_approver staff%rowtype;
  v_resolved_cashier uuid;
  v_deficit integer;
  -- How long a queued offline sale may lag behind before occurred_at is
  -- rejected as implausible. Generous on purpose: rejecting a real
  -- historical offline sale outright (with no override) is worse than
  -- accepting a slightly-too-old one.
  v_max_offline_age constant interval := interval '30 days';
begin
  v_store_id := auth_store_id();
  if v_store_id is null then raise exception 'Not a registered staff member of any store'; end if;
  if p_payment_type not in ('cash', 'credit', 'qr') then raise exception 'Invalid payment type'; end if;

  -- Idempotent replay: a queued sale may be retried (flaky reconnect, the
  -- sync engine retrying after a partial failure). If this exact
  -- client_request_id already produced a sale for this store, return that
  -- original result instead of erroring or inserting a duplicate. This must
  -- run before cashier-token resolution — a replay of an already-completed
  -- sale shouldn't fail just because the token that created it has since
  -- expired or been revoked.
  if p_client_request_id is not null then
    select id, total into v_sale_id, v_total
      from sales
      where client_request_id = p_client_request_id and store_id = v_store_id;
    if found then
      return query select v_sale_id, v_total;
    end if;
  end if;

  if p_occurred_at is not null then
    if p_occurred_at > now() + interval '5 minutes' then
      raise exception 'INVALID_OCCURRED_AT';
    end if;
    if p_occurred_at < now() - v_max_offline_age then
      raise exception 'INVALID_OCCURRED_AT';
    end if;
  end if;

  if p_cashier_token is not null then
    select staff_id into v_resolved_cashier
      from cashier_sessions
      where token = p_cashier_token
        and store_id = v_store_id
        and revoked_at is null
        and expires_at > now();
    if not found then
      raise exception 'EXPIRED_CASHIER_SESSION';
    end if;
    v_cashier_id := v_resolved_cashier;
  end if;

  if p_payment_type = 'credit' then
    if p_customer_id is null then raise exception 'A customer is required for a credit sale'; end if;
    select * into v_customer from customers where id = p_customer_id and store_id = v_store_id for update;
    if not found then raise exception 'Customer not found in this store'; end if;
  end if;
  v_reference_no := nullif(trim(coalesce(p_reference_no, '')), '');
  if p_payment_type = 'qr' and v_reference_no is null then raise exception 'A reference number is required for a QR payment'; end if;
  if p_payment_type <> 'qr' then v_reference_no := null; end if;
  if (p_items is null or jsonb_array_length(p_items) = 0) and (p_services is null or jsonb_array_length(p_services) = 0) then raise exception 'Cart is empty'; end if;

  for v_product_id in select (jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) ->> 'product_id')::uuid loop
    if v_product_id = any(v_seen_product_ids) then raise exception 'Duplicate product in cart — combine it into a single line with the total quantity'; end if;
    v_seen_product_ids := array_append(v_seen_product_ids, v_product_id);
  end loop;
  select coalesce(enabled, true) into v_pack_pricing_enabled from feature_flags where key = 'pack_pricing';
  v_pack_pricing_enabled := coalesce(v_pack_pricing_enabled, true);

  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) order by value ->> 'product_id' loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then raise exception 'Invalid quantity'; end if;
    select * into v_product from products where id = (v_item ->> 'product_id')::uuid and store_id = v_store_id for update;
    if not found then raise exception 'Product not found in this store'; end if;
    if v_product.stock < v_qty and not p_is_offline_replay then
      v_insufficient_stock := array_append(v_insufficient_stock, format('%s: Insufficient stock. Only %s item(s) available.', v_product.name, greatest(v_product.stock, 0)));
      continue;
    end if;
    if v_product.pack_quantity is not null and v_pack_pricing_enabled then
      v_unit_price := round(v_product.pack_price / v_product.pack_quantity, 2);
      v_line_total := round(v_qty * v_product.pack_price / v_product.pack_quantity, 2);
    else
      v_unit_price := v_product.price;
      v_line_total := round(v_product.price * v_qty, 2);
    end if;
    v_total := v_total + v_line_total;
    v_computed := v_computed || jsonb_build_object('product_id', v_product.id, 'name', v_product.name, 'quantity', v_qty, 'unit_price', v_unit_price, 'line_total', v_line_total, 'prior_stock', v_product.stock);
  end loop;
  if cardinality(v_insufficient_stock) > 0 then raise exception '%', array_to_string(v_insufficient_stock, ' '); end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
    v_amount := (v_item ->> 'amount')::numeric; v_fee := coalesce((v_item ->> 'fee')::numeric, 0); v_label := v_item ->> 'label';
    if v_label is null or trim(v_label) = '' then raise exception 'Service label is required'; end if;
    if v_amount is null or v_amount <= 0 then raise exception 'Invalid service amount'; end if;
    if v_fee < 0 then raise exception 'Invalid service fee'; end if;
    if v_amount + v_fee > v_max_service_amount then raise exception 'Service amount exceeds the maximum allowed per transaction'; end if;
    v_total := v_total + v_amount + v_fee;
  end loop;

  -- Real credit-limit enforcement. v_customer was already row-locked above,
  -- so this reflects the true, current balance — no stale-read race with a
  -- concurrent sale against the same customer.
  if p_payment_type = 'credit' then
    v_projected_balance := v_customer.balance + v_total;
    if v_customer.credit_limit is not null and v_projected_balance > v_customer.credit_limit then
      if p_override_pin is null then
        raise exception 'CREDIT_LIMIT_EXCEEDED';
      end if;
      select * into v_approver from staff
        where store_id = v_store_id
          and role = 'admin'
          and pin_hash is not null
          and pin_hash = crypt(p_override_pin, pin_hash)
        limit 1;
      if not found then
        raise exception 'INVALID_OVERRIDE_PIN';
      end if;
    end if;
  end if;

  insert into sales (store_id, cashier_id, total, customer_id, payment_type, reference_no, client_request_id, occurred_at, is_offline_replay)
    values (v_store_id, v_cashier_id, v_total, p_customer_id, p_payment_type, v_reference_no, p_client_request_id, p_occurred_at, p_is_offline_replay)
    returning id into v_sale_id;
  for v_computed_item in select * from jsonb_array_elements(v_computed) loop
    insert into sale_items (sale_id, product_id, name, quantity, price, item_type, line_total) values (v_sale_id, (v_computed_item ->> 'product_id')::uuid, v_computed_item ->> 'name', (v_computed_item ->> 'quantity')::integer, (v_computed_item ->> 'unit_price')::numeric, 'product', (v_computed_item ->> 'line_total')::numeric);
    if p_is_offline_replay and (v_computed_item ->> 'prior_stock')::integer < (v_computed_item ->> 'quantity')::integer then
      v_deficit := (v_computed_item ->> 'quantity')::integer - (v_computed_item ->> 'prior_stock')::integer;
      insert into stock_discrepancies (store_id, product_id, sale_id, deficit)
        values (v_store_id, (v_computed_item ->> 'product_id')::uuid, v_sale_id, v_deficit);
    end if;
    update products set stock = stock - (v_computed_item ->> 'quantity')::integer, updated_at = now() where id = (v_computed_item ->> 'product_id')::uuid;
  end loop;
  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
    v_amount := (v_item ->> 'amount')::numeric; v_fee := coalesce((v_item ->> 'fee')::numeric, 0); v_label := v_item ->> 'label';
    insert into sale_items (sale_id, product_id, name, quantity, price, fee, item_type, line_total) values (v_sale_id, null, v_label, 1, v_amount, v_fee, 'service', v_amount + v_fee);
  end loop;

  if p_payment_type = 'credit' then
    update customers set balance = balance + v_total where id = p_customer_id;
    if v_approver.id is not null then
      insert into credit_overrides (store_id, sale_id, customer_id, cashier_id, approved_by, previous_balance, credit_limit, transaction_total, resulting_balance)
        values (v_store_id, v_sale_id, p_customer_id, v_cashier_id, v_approver.id, v_customer.balance, v_customer.credit_limit, v_total, v_projected_balance);
    end if;
  end if;

  return query select v_sale_id, v_total;
end;
$$;
