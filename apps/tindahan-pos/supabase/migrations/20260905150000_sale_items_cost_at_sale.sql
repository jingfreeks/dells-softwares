-- sale_items remembers what the product cost at the time
--
-- Until now sale_items stored price, quantity and line_total but no cost, so
-- every margin this system reports is recomputed against products.cost -- the
-- CURRENT cost. Change a supplier price today and last month's profit silently
-- changes with it. review_summary() has been disclosing that with
-- profit_basis_share since 20260904120000, but disclosure is not accuracy.
--
-- THIS ONLY HELPS SALES MADE FROM NOW ON
--
-- There is no snapshot to backfill: the cost a product had in July was never
-- written down anywhere, and inventing one from today's value would be exactly
-- the fabrication the product decisions forbid. Historical rows keep
-- cost_at_sale null and keep being valued at current cost, which is why this
-- is worth shipping early rather than well -- every day it waits is another
-- day of sales that can never have a true margin.
--
-- WHERE THE VALUE COMES FROM
--
-- v_product is already products%rowtype in checkout_sale's item loop, so the
-- cost is in scope at the moment the line is priced. It rides along in the
-- same jsonb the loop already builds rather than being re-selected, so the
-- snapshot is guaranteed to be the row the price came from -- not a second
-- read that could land after someone edited the product mid-transaction.
--
-- NULLABLE, AND NOT DEFAULTED
--
-- A product with no cost recorded still has none at sale time. Writing 0 would
-- claim a 100% margin, which is the misleading zero the same decisions rule
-- out. Null means "not known", and review_summary() excludes it from the
-- profit basis exactly as it already excludes a null products.cost.
--
-- OFFLINE REPLAY takes the same path: the loop is shared, so a sale queued
-- offline records the cost as it stood when the REPLAY was accepted, not when
-- the sale happened. That is a known imprecision, and the honest one available
-- -- the device never captured a cost either.
--
-- CREATE OR REPLACE with the identical 13-argument signature, so the ACL and
-- every existing caller survive. Nothing else in the function changes.
--
-- Affected modules : POS, Review, reporting
-- Rollback         : alter table sale_items drop column cost_at_sale;
--                    re-apply 20260903200000's checkout_sale().
-- Risk             : medium -- touches the checkout path. The change is two
--                    values in one insert; every other line is byte-identical
--                    to the migration it is lifted from.

alter table sale_items
  add column cost_at_sale numeric(10, 2)
    check (cost_at_sale is null or cost_at_sale >= 0);

comment on column sale_items.cost_at_sale is
  'What the product cost when this line was sold, captured at checkout. Null '
  'for lines written before 20260905150000, and for products with no cost '
  'recorded -- null means "not known", never zero. Prefer it over '
  'products.cost when computing margin; products.cost is today''s cost and '
  'answers a different question.';

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
  v_cashout_total numeric(10, 2) := 0;
  v_cash_out_cap numeric(10, 2);
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
    v_computed := v_computed || jsonb_build_object('product_id', v_product.id, 'name', v_product.name, 'quantity', v_qty, 'unit_price', v_unit_price, 'line_total', v_line_total, 'prior_stock', v_product.stock, 'cost', v_product.cost);
  end loop;
  if cardinality(v_insufficient_stock) > 0 then raise exception '%', array_to_string(v_insufficient_stock, ' '); end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
    v_amount := (v_item ->> 'amount')::numeric; v_fee := coalesce((v_item ->> 'fee')::numeric, 0); v_label := v_item ->> 'label';
    if v_label is null or trim(v_label) = '' then raise exception 'Service label is required'; end if;
    if v_amount is null or v_amount <= 0 then raise exception 'Invalid service amount'; end if;
    if v_fee < 0 then raise exception 'Invalid service fee'; end if;
    if v_amount + v_fee > v_max_service_amount then raise exception 'Service amount exceeds the maximum allowed per transaction'; end if;
    v_total := v_total + v_amount + v_fee;
    -- New, optional keys -- absent on every service type except cash-out,
    -- and absent entirely from an unmigrated client's request, in which
    -- case this simply never adds to v_cashout_total and the cap below
    -- never triggers, same as a store with no cap set.
    if (v_item ->> 'service_type') = 'cashout' then
      -- greatest(...,0): a negative cash_handed_over can't be used to net
      -- a large one out and slip the sum under the cap.
      v_cashout_total := v_cashout_total + greatest(coalesce((v_item ->> 'cash_handed_over')::numeric, 0), 0);
    end if;
  end loop;

  if v_cashout_total > 0 then
    select cashier_cash_out_cap into v_cash_out_cap from stores where id = v_store_id;
    if v_cash_out_cap is not null and v_cashout_total > v_cash_out_cap and auth_role() <> 'admin' then
      -- Same token, same table, same reasoning as the credit-limit override
      -- and void_requires_pin (20260903190000): an admin's PIN, exchanged
      -- for a short-lived single-use receipt via check_credit_override_pin()
      -- before this call, rather than a raw PIN this function would have no
      -- safe way to rate-limit.
      if p_override_token is null then
        raise exception 'CASH_OUT_CAP_EXCEEDED';
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
    end if;
  end if;

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
      --
      -- If the cash-out cap check above already consumed p_override_token,
      -- this lookup correctly finds nothing (consumed_at is no longer null)
      -- and asks for a fresh approval -- a single sale needing two separate
      -- owner sign-offs is rare enough that requiring them sequentially,
      -- rather than building multi-token plumbing for it, is the right
      -- trade here.
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
    insert into sale_items (sale_id, product_id, name, quantity, price, item_type, line_total, cost_at_sale) values (v_sale_id, (v_computed_item ->> 'product_id')::uuid, v_computed_item ->> 'name', (v_computed_item ->> 'quantity')::integer, (v_computed_item ->> 'unit_price')::numeric, 'product', (v_computed_item ->> 'line_total')::numeric, (v_computed_item ->> 'cost')::numeric);
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

-- Same "grow the identity in place, don't drop-and-recreate" discipline
-- 20260902190000 and the audit's SEC-002/SEC-007 exist because of. This
-- CREATE OR REPLACE did not add a new parameter, so it does not need a
-- fresh revoke/grant -- the function's identity (argument list) is
-- unchanged from 20260903100000, and REPLACE preserves the ACL that was
-- already set on it.

-- Extend the store-settings audit trigger's allow-list (20260831153000) so
-- both new columns are covered by the same audit_log rows every other
-- store-settings change already gets. Same function body otherwise.
