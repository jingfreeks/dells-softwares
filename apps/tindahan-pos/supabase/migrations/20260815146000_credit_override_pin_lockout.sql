-- =============================================================================
-- Rate-limit the credit-limit-override PIN in checkout_sale()
-- -----------------------------------------------------------------------------
-- Found while working through the QA doc's negative-test scenarios for the
-- credit-override flow (attempting a wrong override PIN). checkout_sale()'s
-- override-PIN check (added 0022_owner_pin_override.sql) has never had any
-- rate limiting -- unlike start_cashier_session()'s PIN-login path, which
-- locks after 5 consecutive wrong guesses for 15 minutes
-- (0025_start_cashier_session_lockout_fix.sql), a wrong p_override_pin here
-- just returns INVALID_OVERRIDE_PIN and nothing else happens.
--
-- Confirmed live on staging as the QA Cashier: 8 consecutive wrong-PIN
-- checkout_sale attempts against an over-limit customer all returned
-- INVALID_OVERRIDE_PIN with no lockout, and the admin's own
-- pin_failed_attempts/pin_locked_until columns were untouched throughout
-- (0/null before and after). A 4-digit PIN is only 10,000 combinations --
-- with zero rate limiting, any signed-in cashier can script their way to a
-- valid admin override PIN and defeat the entire "admin approval needed to
-- exceed a customer's credit limit" control this app otherwise enforces
-- correctly.
--
-- checkout_sale() doesn't know *which* admin's PIN is being guessed (the
-- client only ever sends a bare 4-digit code, matched against every admin
-- in the store -- see OwnerApprovalModal, which has no admin picker), so
-- this can't reuse staff.pin_failed_attempts/pin_locked_until the way
-- start_cashier_session() does for a specific p_staff_id. Instead this
-- tracks failed *override* attempts against the calling staff member (the
-- cashier submitting the guesses) -- the actual party a brute-force
-- attempt needs to be stopped from continuing, regardless of which admin
-- they're trying to impersonate. Same 5-attempts/15-minutes shape as the
-- existing PIN-login lockout for consistency.
--
-- SUPERSEDED IN PART BY 20260815147000: after this migration shipped, live
-- re-verification (the same step that found this bug) found the increment
-- below never actually persists -- see that migration's header for why,
-- and for the real fix. Left as originally written/applied here rather
-- than rewritten in place, since this version is already live on staging
-- under this migration's version number; 20260815147000 is additive on
-- top of it.
-- =============================================================================

alter table staff
  add column if not exists override_pin_failed_attempts integer not null default 0,
  add column if not exists override_pin_locked_until timestamptz;

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
  p_is_offline_replay boolean default false,
  p_discount_type text default null,
  p_discount_value numeric default null
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
  v_caller staff%rowtype;
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
      if p_override_pin is null then
        raise exception 'CREDIT_LIMIT_EXCEEDED';
      end if;

      select * into v_caller from staff where id = v_cashier_id for update;
      if found and v_caller.override_pin_locked_until is not null and v_caller.override_pin_locked_until > now() then
        raise exception 'OVERRIDE_PIN_LOCKED';
      end if;

      select * into v_approver from staff
        where store_id = v_store_id
          and role = 'admin'
          and pin_hash is not null
          and pin_hash = crypt(p_override_pin, pin_hash)
        limit 1;
      if not found then
        update staff
          set override_pin_failed_attempts = override_pin_failed_attempts + 1,
              override_pin_locked_until = case when override_pin_failed_attempts + 1 >= 5 then now() + interval '15 minutes' else override_pin_locked_until end
          where id = v_cashier_id;
        raise exception 'INVALID_OVERRIDE_PIN';
      end if;

      update staff set override_pin_failed_attempts = 0, override_pin_locked_until = null where id = v_cashier_id;
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
$$;

comment on function checkout_sale is
  'Rings up a sale. The credit-limit-override PIN path locks out the '
  'calling staff member for 15 minutes after 5 consecutive wrong guesses '
  '(override_pin_failed_attempts/override_pin_locked_until on staff), the '
  'same shape as start_cashier_session()''s PIN-login lockout -- see '
  '20260815146000. NOTE: this increment does not actually persist -- see '
  '20260815147000 for why and for the real fix.';

-- admin_set_staff_pin() already resets pin_failed_attempts/pin_locked_until
-- (that staff member's own login-PIN lockout) when an admin issues them a
-- fresh PIN. Reset the new override-attempt columns the same way, so a
-- newly-reissued PIN doesn't inherit a stale override lockout.
create or replace function admin_set_staff_pin(p_staff_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth_role() <> 'admin' then
    raise exception 'Only an admin can set another staff member''s PIN';
  end if;
  if p_pin !~ '^\d{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;
  update staff
    set pin_hash = crypt(p_pin, gen_salt('bf')),
        pin_failed_attempts = 0,
        pin_locked_until = null,
        override_pin_failed_attempts = 0,
        override_pin_locked_until = null
    where id = p_staff_id and store_id = auth_store_id();
  if not found then
    raise exception 'Staff member not found in this store';
  end if;
end;
$$;
