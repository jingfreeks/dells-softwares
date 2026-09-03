-- Close the un-rate-limited override-PIN path.
--
-- 20260815147000 moved the credit-override PIN check out of checkout_sale()
-- into check_credit_override_pin(), because a counter incremented inside a
-- function that then raises is rolled back with the rest of the transaction --
-- the attempts never persisted. That fix deliberately left the offline-replay
-- branch on the raw PIN, reasoning that the PIN was captured while the device
-- had no network and is simplest to replay as-is, and recorded that hardening
-- p_is_offline_replay's trust boundary was pre-existing and separate.
--
-- This is that separate change, and the reason it is worth making now is that
-- p_is_offline_replay is not a trust boundary at all. It is an ordinary
-- parameter with a default:
--
--   checkout_sale(..., p_override_pin text default null,
--                      p_is_offline_replay boolean default false, ...)
--
-- Nothing establishes that a call claiming to be a replay is one. So any
-- authenticated staff member can call checkout_sale with
-- p_is_offline_replay => true and a guessed PIN, over and over, with no
-- counter and no lockout -- an unlimited oracle against an admin's override
-- PIN, reachable while fully online. The rate limit on the live path is
-- bypassed by setting a boolean.
--
-- THE FIX: both paths require a token from check_credit_override_pin().
--
-- This does not re-prompt anyone and does not lose the offline capture. A
-- queued sale still stores the PIN the approver typed while the device was
-- offline; the client simply exchanges it for a token at replay time, which is
-- by definition a moment when the device is back online. The exchange is
-- rate-limited and locks out after five wrong guesses, and it counts against
-- the cashier replaying rather than the approver, exactly as the live path
-- does.
--
-- The counter still cannot live in this function -- that is 20260815147000's
-- finding and it has not changed. This works precisely because the counting
-- happens in a function that returns a row instead of raising.
--
-- p_override_pin stays in the signature and is ignored. Removing it would mean
-- dropping and recreating the function, which discards the ACL (see
-- 20260902190000 for what that costs), and would break any client still
-- sending it during a rollout.
--
-- Rollout note: a client older than this migration replays with a raw PIN and
-- no token, so an over-limit credit sale in its queue is refused with
-- CREDIT_LIMIT_EXCEEDED and surfaced to the cashier rather than silently
-- retried. That is the correct failure -- the sale genuinely cannot be
-- authorised without a validated override -- but it is a visible change during
-- the window where old clients are still cached.

CREATE OR REPLACE FUNCTION public.checkout_sale(p_items jsonb, p_services jsonb DEFAULT '[]'::jsonb, p_customer_id uuid DEFAULT NULL::uuid, p_payment_type text DEFAULT 'cash'::text, p_reference_no text DEFAULT NULL::text, p_override_pin text DEFAULT NULL::text, p_cashier_token text DEFAULT NULL::text, p_client_request_id uuid DEFAULT NULL::uuid, p_occurred_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_is_offline_replay boolean DEFAULT false, p_discount_type text DEFAULT NULL::text, p_discount_value numeric DEFAULT NULL::numeric, p_override_token text DEFAULT NULL::text)
 RETURNS TABLE(sale_id uuid, total numeric, receipt_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_store_id uuid;
  v_cashier_id uuid := auth.uid();
  v_sale_id uuid;
  v_total numeric(10, 2) := 0;
  v_item jsonb;
  v_product products%rowtype;
  v_customer customers%rowtype;
  v_qty integer;
  v_qty_numeric numeric;
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
  v_token_row credit_override_tokens%rowtype;
  v_resolved_cashier uuid;
  v_deficit integer;
  v_max_offline_age constant interval := interval '30 days';
  v_existing_sale_id uuid;
  v_existing_total numeric(10, 2);
  v_existing_receipt_number text;
  v_next_number integer;
  v_prefix text;
  v_receipt_number text;
  v_vat_status text;
  v_vat_rate numeric(5, 4);
  v_vatable_sales numeric(10, 2) := 0;
  v_vat_amount numeric(10, 2) := 0;
  v_vat_exempt_sales numeric(10, 2) := 0;
  v_zero_rated_sales numeric(10, 2) := 0;
  v_device_id uuid;
  v_discount_amount numeric(10, 2) := 0;
begin
  v_store_id := auth_store_id();
  if v_store_id is null then raise exception 'Not a registered staff member of any store'; end if;
  if p_payment_type not in ('cash', 'credit', 'qr') then raise exception 'Invalid payment type'; end if;

  select id into v_device_id from devices where id = auth.uid() and store_id = v_store_id and unpaired_at is null;

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
    v_qty_numeric := (v_item ->> 'quantity')::numeric;
    if v_qty_numeric is null or v_qty_numeric <= 0 or v_qty_numeric != trunc(v_qty_numeric) then
      raise exception 'Invalid quantity';
    end if;
    v_qty := v_qty_numeric::integer;
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

  if p_discount_type is not null then
    if not public.current_store_has_feature('pos.discounts') then
      raise exception 'FEATURE_NOT_ENABLED: pos.discounts';
    end if;
    if p_discount_type not in ('percentage', 'flat') then
      raise exception 'INVALID_DISCOUNT_TYPE';
    end if;
    if p_discount_value is null or p_discount_value <= 0 then
      raise exception 'INVALID_DISCOUNT_VALUE';
    end if;
    if p_discount_type = 'percentage' then
      if p_discount_value > 100 then
        raise exception 'INVALID_DISCOUNT_VALUE';
      end if;
      v_discount_amount := round(v_total * p_discount_value / 100, 2);
    else
      v_discount_amount := least(p_discount_value, v_total);
    end if;
    v_total := v_total - v_discount_amount;
  end if;

  if p_payment_type = 'credit' then
    v_projected_balance := v_customer.balance + v_total;
    if v_customer.credit_limit is not null and v_projected_balance > v_customer.credit_limit then
      -- One path for both. A replay reaches this function only once the
      -- device is back online, so it can exchange its stored PIN for a token
      -- through check_credit_override_pin() exactly as the live path does --
      -- which is where the attempt counting and the 15-minute lockout live.
      -- p_override_pin is no longer read. See 20260903100000.
      if p_override_token is null then
        raise exception 'CREDIT_LIMIT_EXCEEDED';
      end if;
      select * into v_token_row from credit_override_tokens
        where store_id = v_store_id
          and cashier_id = v_cashier_id
          and consumed_at is null
          and expires_at > now()
          and token_hash = crypt(p_override_token, token_hash)
        order by created_at desc
        limit 1
        for update;
      if not found then
        raise exception 'INVALID_OVERRIDE_PIN';
      end if;
      update credit_override_tokens set consumed_at = now() where id = v_token_row.id;
      select * into v_approver from staff where id = v_token_row.approved_by;
    end if;
  end if;

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

  select vat_status, vat_rate into v_vat_status, v_vat_rate from stores where id = v_store_id;
  if v_vat_status = 'vat_registered' then
    v_vatable_sales := round(v_total / (1 + v_vat_rate), 2);
    v_vat_amount := v_total - v_vatable_sales;
  elsif v_vat_status = 'zero_rated' then
    v_zero_rated_sales := v_total;
  elsif v_vat_status = 'vat_exempt' then
    v_vat_exempt_sales := v_total;
  end if;

  insert into sales (
    store_id, cashier_id, total, customer_id, payment_type, reference_no, client_request_id, occurred_at,
    is_offline_replay, receipt_number, vat_status, vat_rate, vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales,
    device_id, discount_type, discount_value, discount_amount
  )
    values (
      v_store_id, v_cashier_id, v_total, p_customer_id, p_payment_type, v_reference_no, p_client_request_id, p_occurred_at,
      p_is_offline_replay, v_receipt_number, v_vat_status, v_vat_rate, v_vatable_sales, v_vat_amount, v_vat_exempt_sales, v_zero_rated_sales,
      v_device_id, p_discount_type, p_discount_value, v_discount_amount
    )
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

  insert into audit_log (store_id, actor_id, action, entity_type, entity_id, new_value)
    values (
      v_store_id, v_cashier_id, 'sale_created', 'sale', v_sale_id,
      case when v_discount_amount > 0 then
        jsonb_build_object('total', v_total, 'receipt_number', v_receipt_number, 'payment_type', p_payment_type, 'discount_amount', v_discount_amount)
      else
        jsonb_build_object('total', v_total, 'receipt_number', v_receipt_number, 'payment_type', p_payment_type)
      end
    );

  return query select v_sale_id, v_total, v_receipt_number;
end;
$function$
;
