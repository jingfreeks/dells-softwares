-- =============================================================================
-- Reject a decimal refund quantity with a friendly message instead of a
-- raw Postgres error
-- -----------------------------------------------------------------------------
-- Same class of bug just fixed in checkout_sale() (20260815148000), found
-- immediately after by checking every other RPC in this codebase with the
-- identical `(value ->> 'quantity')::integer` pattern before its own
-- "Invalid ... quantity" check runs. refund_sale_items() has the exact
-- same issue: Postgres's integer parser rejects a decimal-point value
-- outright, so it never reaches the "Invalid refund quantity" check --
-- confirmed live on staging against a real completed sale: refunding
-- quantity 1.5 returned "invalid input syntax for type integer: \"1.5\""
-- (code 22P02), not the friendly message.
--
-- Same low severity as checkout_sale()'s case: Reports' refund UI only
-- ever produces integer quantities (a stepper, not free text), so this is
-- unreachable through normal use -- reachable only via a direct RPC call.
-- Fixed the same way: extract as numeric first, explicitly reject a
-- non-whole-number before ever casting to integer.
-- =============================================================================

create or replace function refund_sale_items(p_sale_id uuid, p_reason text, p_items jsonb)
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
  v_qty_numeric numeric;
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

    v_qty_numeric := (v_item ->> 'quantity')::numeric;
    if v_qty_numeric is null or v_qty_numeric <= 0 or v_qty_numeric != trunc(v_qty_numeric) then
      raise exception 'Invalid refund quantity';
    end if;
    v_qty := v_qty_numeric::integer;

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
