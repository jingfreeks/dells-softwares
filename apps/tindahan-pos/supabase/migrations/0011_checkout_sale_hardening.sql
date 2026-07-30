-- Security/production-readiness hardening for checkout_sale(), found during
-- a senior-level architecture/security review:
--
--   1. Service lines (e-load, cash-in/out, printing) have no catalog price
--      to validate against — the amount/fee are necessarily client-supplied
--      (documented in 0004). That was previously unbounded: a compromised
--      or rogue cashier session could submit an arbitrarily large service
--      amount and have it recorded as a legitimate sale. Adds a sanity cap
--      well above any real single transaction at a sari-sari store.
--   2. A cart with the same product_id repeated as two separate line
--      entries validated each line against the product's pre-decrement
--      stock independently (both could pass with qty=5 against stock=5),
--      then failed at Pass 2 with a raw `products_stock_check` constraint
--      violation instead of a friendly error — the DB already prevented
--      overselling here, this just gives a clean message instead of a
--      leaked constraint name.

create or replace function checkout_sale(
  p_items jsonb,
  p_services jsonb default '[]'::jsonb,
  p_customer_id uuid default null,
  p_payment_type text default 'cash'
)
returns table (sale_id uuid, total numeric)
language plpgsql
security definer
set search_path = public
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
  -- Sanity ceiling for a single client-supplied service line — services
  -- have no catalog price to check against, so this is the only backstop
  -- against a garbage or malicious amount. Comfortably above any real
  -- e-load/cash-in/cash-out transaction at a sari-sari store.
  v_max_service_amount constant numeric := 50000;
begin
  select store_id into v_store_id from staff where id = v_cashier_id;
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if p_payment_type not in ('cash', 'credit') then
    raise exception 'Invalid payment type';
  end if;

  if p_payment_type = 'credit' then
    if p_customer_id is null then
      raise exception 'A customer is required for a credit sale';
    end if;
    -- Row-lock the customer now so a concurrent credit sale or payment
    -- against the same customer can't race this one's balance update.
    select * into v_customer from customers
      where id = p_customer_id and store_id = v_store_id
      for update;
    if not found then
      raise exception 'Customer not found in this store';
    end if;
  end if;

  if (p_items is null or jsonb_array_length(p_items) = 0)
     and (p_services is null or jsonb_array_length(p_services) = 0) then
    raise exception 'Cart is empty';
  end if;

  -- Reject a cart with the same product listed twice as separate lines
  -- up front, with a clear message, instead of letting it fall through to
  -- a raw stock-check constraint violation in Pass 2.
  for v_product_id in select (jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) ->> 'product_id')::uuid
  loop
    if v_product_id = any(v_seen_product_ids) then
      raise exception 'Duplicate product in cart — combine it into a single line with the total quantity';
    end if;
    v_seen_product_ids := array_append(v_seen_product_ids, v_product_id);
  end loop;

  select coalesce(enabled, true) into v_pack_pricing_enabled
    from feature_flags where key = 'pack_pricing';
  v_pack_pricing_enabled := coalesce(v_pack_pricing_enabled, true);

  -- Pass 1: validate, lock each product row against concurrent sales, and
  -- compute this line's charge exactly once — the only place pricing is
  -- ever computed.
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity';
    end if;

    select * into v_product from products
      where id = (v_item ->> 'product_id')::uuid
        and store_id = v_store_id
      for update;

    if not found then
      raise exception 'Product not found in this store';
    end if;

    if v_product.stock < v_qty then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    if v_product.pack_quantity is not null and v_pack_pricing_enabled then
      v_unit_price := round(v_product.pack_price / v_product.pack_quantity, 2);
      v_line_total := round(v_qty * v_product.pack_price / v_product.pack_quantity, 2);
    else
      v_unit_price := v_product.price;
      v_line_total := round(v_product.price * v_qty, 2);
    end if;
    v_total := v_total + v_line_total;

    v_computed := v_computed || jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'quantity', v_qty,
      'unit_price', v_unit_price,
      'line_total', v_line_total
    );
  end loop;

  -- Services: amount/fee come from the client (no catalog to check
  -- against); validated for shape, non-negativity, and a sanity ceiling.
  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb))
  loop
    v_amount := (v_item ->> 'amount')::numeric;
    v_fee := coalesce((v_item ->> 'fee')::numeric, 0);
    v_label := v_item ->> 'label';
    if v_label is null or trim(v_label) = '' then
      raise exception 'Service label is required';
    end if;
    if v_amount is null or v_amount <= 0 then
      raise exception 'Invalid service amount';
    end if;
    if v_fee < 0 then
      raise exception 'Invalid service fee';
    end if;
    if v_amount + v_fee > v_max_service_amount then
      raise exception 'Service amount exceeds the maximum allowed per transaction';
    end if;
    v_total := v_total + v_amount + v_fee;
  end loop;

  insert into sales (store_id, cashier_id, total, customer_id, payment_type)
    values (v_store_id, v_cashier_id, v_total, p_customer_id, p_payment_type)
    returning id into v_sale_id;

  -- Pass 2: write product line items and deduct stock using the pricing
  -- already computed in Pass 1 — no re-select, no recomputation.
  for v_computed_item in select * from jsonb_array_elements(v_computed)
  loop
    insert into sale_items (sale_id, product_id, name, quantity, price, item_type, line_total)
      values (
        v_sale_id,
        (v_computed_item ->> 'product_id')::uuid,
        v_computed_item ->> 'name',
        (v_computed_item ->> 'quantity')::integer,
        (v_computed_item ->> 'unit_price')::numeric,
        'product',
        (v_computed_item ->> 'line_total')::numeric
      );

    update products
      set stock = stock - (v_computed_item ->> 'quantity')::integer, updated_at = now()
      where id = (v_computed_item ->> 'product_id')::uuid;
  end loop;

  -- Service line items — no stock to touch
  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb))
  loop
    v_amount := (v_item ->> 'amount')::numeric;
    v_fee := coalesce((v_item ->> 'fee')::numeric, 0);
    v_label := v_item ->> 'label';

    insert into sale_items (sale_id, product_id, name, quantity, price, fee, item_type, line_total)
      values (v_sale_id, null, v_label, 1, v_amount, v_fee, 'service', v_amount + v_fee);
  end loop;

  if p_payment_type = 'credit' then
    update customers set balance = balance + v_total where id = p_customer_id;
  end if;

  return query select v_sale_id, v_total;
end;
$$;

revoke all on function checkout_sale(jsonb, jsonb, uuid, text) from public;
grant execute on function checkout_sale(jsonb, jsonb, uuid, text) to authenticated;
