-- 0037_document_series.sql
--
-- Real, per-store, transaction-safe OR/invoice numbering.
--
-- Until now `sales` had no receipt/OR number column at all — the number
-- printed on a receipt was `ReceiptSettingsMock.nextReceiptNumber`, a plain
-- string sitting in localStorage that an admin could hand-edit in Settings
-- and that was never incremented on checkout. Every printed receipt showed
-- the same static value, and nothing prevented two stores or two POS
-- devices at the same store from ever colliding, because there was nothing
-- server-side tracking it.
--
-- This migration adds:
--   1. `document_series` — one row per store (per `series_key`, currently
--      always 'default') holding the next number to hand out and an
--      optional prefix. Independent per store, so Store A and Store B can
--      both be on "000001" without conflict — see the Multi-Store Invoice
--      and OR Numbering requirement doc.
--   2. `sales.receipt_number` — the number actually assigned to a sale,
--      unique per store (partial index; pre-migration rows and any sale
--      that somehow never got one stay NULL and don't collide).
--   3. An updated `checkout_sale()` that allocates the number atomically,
--      inside the same row-locked transaction that already inserts the
--      sale — no separate RPC round trip, no frontend counter. A retried/
--      replayed request (matched by `client_request_id`, e.g. an offline
--      sale synced later) returns the *same* number it already has instead
--      of consuming a new one.

create table document_series (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  series_key text not null default 'default',
  prefix text not null default '',
  next_number integer not null default 1,
  created_at timestamptz not null default now(),
  unique (store_id, series_key)
);

alter table document_series enable row level security;

create policy "admin can view own store document series"
  on document_series for select
  using (store_id = auth_store_id() and auth_role() = 'admin');

-- Deliberately no insert/update/delete policy for clients — the only way a
-- row is created or advanced is inside checkout_sale()'s own transaction
-- (SECURITY DEFINER), exactly like `sales` itself has no client INSERT
-- policy below.

alter table sales add column receipt_number text;

-- Partial: only rows actually assigned a number by checkout_sale() are
-- constrained, so this doesn't choke on the NULLs already sitting in the
-- table from before this migration.
create unique index sales_store_receipt_number_key
  on sales (store_id, receipt_number)
  where receipt_number is not null;

-- `create or replace function` cannot change an existing function's return
-- type (adding `receipt_number` to the output table) — Postgres requires a
-- drop first. Same signature as 0033's, so this is the only overload.
drop function if exists checkout_sale(
  jsonb, jsonb, uuid, text, text, text, text, uuid, timestamptz, boolean
);

create function checkout_sale(
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
returns table (sale_id uuid, total numeric, receipt_number text)
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
  v_max_offline_age constant interval := interval '30 days';
  v_existing_sale_id uuid;
  v_existing_total numeric(10, 2);
  v_existing_receipt_number text;
  v_next_number integer;
  v_prefix text;
  v_receipt_number text;
begin
  v_store_id := auth_store_id();
  if v_store_id is null then raise exception 'Not a registered staff member of any store'; end if;
  if p_payment_type not in ('cash', 'credit', 'qr') then raise exception 'Invalid payment type'; end if;

  if p_client_request_id is not null then
    select sales.id, sales.total, sales.receipt_number
      into v_existing_sale_id, v_existing_total, v_existing_receipt_number
      from sales
      where sales.client_request_id = p_client_request_id and sales.store_id = v_store_id;
    if found then
      return query select v_existing_sale_id, v_existing_total, v_existing_receipt_number;
      return;
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

  -- Allocate the next receipt/OR number for this store, atomically. The row
  -- lock below is what makes two POS devices/cashiers checking out at the
  -- same instant safe — the second transaction blocks on this SELECT until
  -- the first commits its UPDATE, so they can never hand out the same
  -- number. Lazily creates the store's series on its very first sale, since
  -- there's no separate store-provisioning step that pre-creates it.
  select next_number, prefix into v_next_number, v_prefix
    from document_series
    where store_id = v_store_id and series_key = 'default'
    for update;
  if not found then
    insert into document_series (store_id, series_key, next_number, prefix)
      values (v_store_id, 'default', 1, '')
      returning next_number, prefix into v_next_number, v_prefix;
  end if;
  v_receipt_number := v_prefix || lpad(v_next_number::text, 6, '0');
  update document_series
    set next_number = v_next_number + 1
    where store_id = v_store_id and series_key = 'default';

  insert into sales (store_id, cashier_id, total, customer_id, payment_type, reference_no, client_request_id, occurred_at, is_offline_replay, receipt_number)
    values (v_store_id, v_cashier_id, v_total, p_customer_id, p_payment_type, v_reference_no, p_client_request_id, p_occurred_at, p_is_offline_replay, v_receipt_number)
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

  return query select v_sale_id, v_total, v_receipt_number;
end;
$$;

-- The drop above also drops the previous grants — reinstate them.
revoke all on function checkout_sale(jsonb, jsonb, uuid, text, text, text, text, uuid, timestamptz, boolean) from public;
grant execute on function checkout_sale(jsonb, jsonb, uuid, text, text, text, text, uuid, timestamptz, boolean) to authenticated;
