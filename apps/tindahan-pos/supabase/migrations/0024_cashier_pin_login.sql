-- Cashier PIN quick-switch login.
--
-- Cashiers still can't sign in with their own Supabase Auth credentials
-- (create-cashier gives them a random, never-shown password) — the browser
-- stays signed in as whichever admin/owner set the device up. This migration
-- adds a real, server-verified "who's actually operating the register right
-- now" layer on top of that one persisted session: a cashier proves their
-- PIN once, gets a short-lived opaque token, and checkout_sale() resolves
-- the REAL cashier_id from that token instead of always falling back to
-- auth.uid() (which would just be the admin). This is not device pairing —
-- no pairing codes, no device table — just per-tab operator identity.
--
-- Rollback, if ever needed:
--   drop function if exists checkout_sale(jsonb, jsonb, uuid, text, text, text, text);
--   drop function if exists end_cashier_session(text);
--   drop function if exists start_cashier_session(uuid, text);
--   drop function if exists admin_set_staff_pin(uuid, text);
--   drop table if exists cashier_sessions;
--   alter table staff drop column active, drop column pin_failed_attempts, drop column pin_locked_until;
--   -- then recreate checkout_sale(jsonb, jsonb, uuid, text, text, text) from 0023's body.

alter table staff
  add column active boolean not null default true,
  add column pin_failed_attempts int not null default 0,
  add column pin_locked_until timestamptz;

-- ---------------------------------------------------------------------------
-- admin_set_staff_pin — lets an admin assign/reset ANOTHER staff member's
-- PIN. Cashiers have no session of their own to call set_own_pin, so this
-- is how they get a real PIN in the first place (mirrors the "Forgot your
-- PIN? Ask <owner>" copy in the reference design — the owner is the one
-- who resets it).
-- ---------------------------------------------------------------------------

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
        pin_locked_until = null
    where id = p_staff_id and store_id = auth_store_id();
  if not found then
    raise exception 'Staff member not found in this store';
  end if;
end;
$$;

revoke all on function admin_set_staff_pin(uuid, text) from public;
grant execute on function admin_set_staff_pin(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- cashier_sessions: proof that a specific staff member verified their PIN
-- on this browser tab, valid for one shift. No client INSERT/UPDATE policy
-- — only written by the security definer RPCs below, same "audit ledger"
-- pattern as credit_overrides (0022).
-- ---------------------------------------------------------------------------

create table cashier_sessions (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(extensions.gen_random_bytes(24), 'base64'),
  store_id uuid not null references stores (id) on delete cascade,
  staff_id uuid not null references staff (id) on delete cascade,
  created_by uuid not null references staff (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index cashier_sessions_token_idx on cashier_sessions (token);
create index cashier_sessions_store_id_idx on cashier_sessions (store_id, created_at desc);

alter table cashier_sessions enable row level security;

create policy "staff can view store cashier sessions"
  on cashier_sessions for select
  using (store_id = auth_store_id());

-- ---------------------------------------------------------------------------
-- start_cashier_session — a signed-in staff member (in practice, whoever
-- the browser is signed into Supabase Auth as) proves p_staff_id's PIN and
-- gets back a token that stands in for that staff member's identity on
-- checkout_sale() calls, without minting a new Supabase Auth session.
-- ---------------------------------------------------------------------------

create or replace function start_cashier_session(p_staff_id uuid, p_pin text)
returns table (
  token text,
  staff_id uuid,
  name text,
  role staff_role,
  avatar_url text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store_id uuid := auth_store_id();
  v_target staff%rowtype;
  v_new_token text;
  v_expires_at timestamptz;
begin
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  select * into v_target from staff where id = p_staff_id and store_id = v_store_id for update;
  if not found then
    raise exception 'Staff member not found in this store';
  end if;

  if not v_target.active then
    raise exception 'INACTIVE_EMPLOYEE';
  end if;

  if v_target.pin_locked_until is not null and v_target.pin_locked_until > now() then
    raise exception 'PIN_LOCKED';
  end if;

  if v_target.pin_hash is null or v_target.pin_hash <> crypt(p_pin, v_target.pin_hash) then
    update staff
      set pin_failed_attempts = pin_failed_attempts + 1,
          pin_locked_until = case when pin_failed_attempts + 1 >= 5 then now() + interval '15 minutes' else pin_locked_until end
      where id = p_staff_id;
    raise exception 'INVALID_PIN';
  end if;

  update staff set pin_failed_attempts = 0, pin_locked_until = null where id = p_staff_id;

  v_expires_at := now() + interval '12 hours';
  insert into cashier_sessions (store_id, staff_id, created_by, expires_at)
    values (v_store_id, p_staff_id, auth.uid(), v_expires_at)
    returning cashier_sessions.token into v_new_token;

  return query select v_new_token, v_target.id, v_target.name, v_target.role, v_target.avatar_url, v_expires_at;
end;
$$;

revoke all on function start_cashier_session(uuid, text) from public;
grant execute on function start_cashier_session(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- end_cashier_session — explicit "switch cashier" / "lock register".
-- ---------------------------------------------------------------------------

create or replace function end_cashier_session(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update cashier_sessions
    set revoked_at = now()
    where token = p_token and store_id = auth_store_id() and revoked_at is null;
end;
$$;

revoke all on function end_cashier_session(text) from public;
grant execute on function end_cashier_session(text) to authenticated;

-- ---------------------------------------------------------------------------
-- checkout_sale: now accepts an optional p_cashier_token. When present, the
-- resolved cashier_sessions.staff_id is used as the sale's cashier_id
-- instead of auth.uid() — so a quick-switched cashier's sale is really
-- attributed to them, not the admin whose Supabase session stays active in
-- the background. When absent, behavior is unchanged (admin working the
-- register directly, exactly like every existing checkout_sale caller).
-- ---------------------------------------------------------------------------

create or replace function checkout_sale(
  p_items jsonb,
  p_services jsonb default '[]'::jsonb,
  p_customer_id uuid default null,
  p_payment_type text default 'cash',
  p_reference_no text default null,
  p_override_pin text default null,
  p_cashier_token text default null
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
begin
  select store_id into v_store_id from staff where id = v_cashier_id;
  if v_store_id is null then raise exception 'Not a registered staff member of any store'; end if;
  if p_payment_type not in ('cash', 'credit', 'qr') then raise exception 'Invalid payment type'; end if;

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
    if v_product.stock < v_qty then
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
    v_computed := v_computed || jsonb_build_object('product_id', v_product.id, 'name', v_product.name, 'quantity', v_qty, 'unit_price', v_unit_price, 'line_total', v_line_total);
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

  insert into sales (store_id, cashier_id, total, customer_id, payment_type, reference_no) values (v_store_id, v_cashier_id, v_total, p_customer_id, p_payment_type, v_reference_no) returning id into v_sale_id;
  for v_computed_item in select * from jsonb_array_elements(v_computed) loop
    insert into sale_items (sale_id, product_id, name, quantity, price, item_type, line_total) values (v_sale_id, (v_computed_item ->> 'product_id')::uuid, v_computed_item ->> 'name', (v_computed_item ->> 'quantity')::integer, (v_computed_item ->> 'unit_price')::numeric, 'product', (v_computed_item ->> 'line_total')::numeric);
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

-- p_cashier_token has a default, but Postgres still treats this as a
-- distinct overload from the old 6-arg signature — drop it so callers
-- can't accidentally resolve to a version that ignores quick-switched
-- cashier identity.
drop function if exists checkout_sale(jsonb, jsonb, uuid, text, text, text);

revoke all on function checkout_sale(jsonb, jsonb, uuid, text, text, text, text) from public;
grant execute on function checkout_sale(jsonb, jsonb, uuid, text, text, text, text) to authenticated;
