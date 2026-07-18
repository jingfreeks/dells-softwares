-- Pack pricing (e.g. "3 pcs for ₱5" tingi candy) and per-line sale totals.
--
-- products.price stays the authoritative, always-populated per-unit price
-- (row = round(pack_price / pack_quantity, 2) when pack pricing is set) so
-- every existing price display keeps working unchanged. pack_quantity /
-- pack_price are additional, optional fields purely for pack-priced items;
-- checkout computes the actual charge for a pack-priced line directly from
-- the pack fraction (qty * pack_price / pack_quantity, rounded once) rather
-- than qty * rounded-per-unit-price, so buying a full pack (e.g. 3 or 6 pcs)
-- always totals to an exact amount instead of drifting by a centavo.
--
-- sale_items.line_total is the amount actually charged for that line —
-- the source of truth for reporting — instead of every consumer
-- recomputing quantity * price (+fee), which no longer holds exactly for
-- pack-priced lines.

alter table products
  add column pack_quantity integer,
  add column pack_price numeric(10, 2),
  add constraint products_pack_quantity_check check (pack_quantity is null or pack_quantity >= 2),
  add constraint products_pack_price_check check (pack_price is null or pack_price >= 0),
  add constraint products_pack_pairing_check check ((pack_quantity is null) = (pack_price is null));

alter table sale_items add column line_total numeric(10, 2);

update sale_items set line_total = round(quantity * price, 2) + fee;

alter table sale_items alter column line_total set not null;

create or replace function checkout_sale(p_items jsonb, p_services jsonb default '[]'::jsonb)
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
  v_qty integer;
  v_amount numeric(10, 2);
  v_fee numeric(10, 2);
  v_label text;
  v_line_total numeric(10, 2);
  v_unit_price numeric(10, 2);
begin
  select store_id into v_store_id from staff where id = v_cashier_id;
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if (p_items is null or jsonb_array_length(p_items) = 0)
     and (p_services is null or jsonb_array_length(p_services) = 0) then
    raise exception 'Cart is empty';
  end if;

  -- Pass 1: validate and total products, locking each row against concurrent sales
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

    if v_product.pack_quantity is not null then
      v_line_total := round(v_qty * v_product.pack_price / v_product.pack_quantity, 2);
    else
      v_line_total := round(v_product.price * v_qty, 2);
    end if;
    v_total := v_total + v_line_total;
  end loop;

  -- Services: amount/fee come from the client (no catalog to check
  -- against); still validated for shape and non-negativity.
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
    v_total := v_total + v_amount + v_fee;
  end loop;

  insert into sales (store_id, cashier_id, total)
    values (v_store_id, v_cashier_id, v_total)
    returning id into v_sale_id;

  -- Pass 2: write product line items and deduct stock
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    select * into v_product from products where id = (v_item ->> 'product_id')::uuid;

    if v_product.pack_quantity is not null then
      v_line_total := round(v_qty * v_product.pack_price / v_product.pack_quantity, 2);
      v_unit_price := round(v_product.pack_price / v_product.pack_quantity, 2);
    else
      v_line_total := round(v_product.price * v_qty, 2);
      v_unit_price := v_product.price;
    end if;

    insert into sale_items (sale_id, product_id, name, quantity, price, item_type, line_total)
      values (v_sale_id, v_product.id, v_product.name, v_qty, v_unit_price, 'product', v_line_total);

    update products
      set stock = stock - v_qty, updated_at = now()
      where id = v_product.id;
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

  return query select v_sale_id, v_total;
end;
$$;

revoke all on function checkout_sale(jsonb, jsonb) from public;
grant execute on function checkout_sale(jsonb, jsonb) to authenticated;
