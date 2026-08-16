-- =============================================================================
-- Grace and downgrade · make subscription status mean something
-- -----------------------------------------------------------------------------
-- Until now `organization_subscriptions.status` has been decorative. The
-- states exist, the console can read them, and core.is_org_member() even
-- carries the comment "suspended = read-only, still visible" -- but nothing
-- anywhere consults the status. A tenant who stopped paying kept exactly the
-- access of one who had not. Suspending someone did nothing at all.
--
-- Architecture v1 §08 specifies the ladder precisely, and the shape of it is
-- the important part:
--
--   State                          Read   Create   Export
--   Active                         yes    yes      yes
--   Past due (grace, 14 days)      yes    yes*     yes      (* with a banner)
--   Suspended                      yes    NO       yes
--   Cancelled (retention, 90 days) yes    NO       yes
--
-- Reads and exports are allowed in EVERY state. Only the ability to create
-- new records is withdrawn, and "data is never destroyed on downgrade."
-- That is a commercial decision as much as a technical one -- re-upgrading
-- has to be frictionless -- and it is what bounds the risk of this
-- migration: the worst outcome of a wrong entitlement is a tenant who can
-- still see and export everything they own.
--
-- WHY THIS IS A NO-OP TODAY. Every organization has an ACTIVE subscription:
-- the Step 4 backfill gave one to every existing store, and
-- core.grant_default_subscription() gives one to every new one. Nothing sets
-- any other status yet, because until this migration there was no function
-- that could. So the ladder is live but nobody is on it.
--
-- FAIL OPEN, DELIBERATELY. An organization with no subscription row at all
-- keeps its writes. That is not tidiness -- grant_default_subscription()
-- swallows its own failures on purpose (a signup must not fail because
-- entitlement provisioning did), so a provisioning gap is a state this
-- system can genuinely reach. Failing closed there would convert a silent
-- warning into a tenant who cannot work, for a bill they were never sent.
-- Suspension is something an operator does on purpose; it should never be
-- something a missing row does by accident.
--
-- WHAT THIS DOES NOT GATE: POS. Selling still works for a suspended tenant.
-- Blocking sales is the sharpest possible change to a live money-handling
-- system, and gating POS is an open commercial decision recorded in
-- PLATFORM.md rather than one to settle inside a migration. Naming the
-- limitation plainly: suspension currently stops back-office work, not the
-- till. Whoever settles that decision extends the same predicate.
--
-- Affected schemas : public (21 write policies re-created, 3 new functions,
--                    platform_set_plan amended), core (1 new function)
-- Rollback         : re-create the 21 policies without the writes clause and
--                    drop the four functions; nothing else is altered
-- Risk             : low today (no tenant is in a blocking state), bounded
--                    by design -- reads and exports are never affected
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The ladder, in one place.
-- -----------------------------------------------------------------------------

create or replace function core.org_writes_allowed(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select case
    -- An organization that does not exist is not owed the benefit of the doubt.
    when not exists (select 1 from core.organizations o where o.id = p_org)
      then false

    -- The organization's own status outranks its billing. This is what finally
    -- makes is_org_member()'s "suspended = read-only, still visible" true.
    when (select o.status from core.organizations o where o.id = p_org)
         in ('SUSPENDED', 'CANCELLED')
      then false

    -- The live subscription, if there is one. TRIALING, ACTIVE and PAST_DUE
    -- all still write -- PAST_DUE is a grace period, not a punishment, and
    -- §08 gives it a banner rather than a lock.
    when exists (
      select 1 from core.organization_subscriptions s
      where s.organization_id = p_org and s.status <> 'CANCELLED'
    ) then (
      select s.status <> 'SUSPENDED'
      from core.organization_subscriptions s
      where s.organization_id = p_org and s.status <> 'CANCELLED'
      limit 1
    )

    -- No live subscription, but a cancelled one: the retention window. They
    -- keep everything they have and can export it; they cannot add to it.
    when exists (
      select 1 from core.organization_subscriptions s
      where s.organization_id = p_org
    ) then false

    -- Never provisioned. Fail OPEN -- see the header.
    else true
  end;
$$;

comment on function core.org_writes_allowed is
  'May this organization create new records? Per Architecture v1 §08 only '
  'writes are ever withdrawn -- reads and exports survive every state. '
  'Returns TRUE for an organization that was never given a subscription, '
  'deliberately: a provisioning gap must not read as a suspension.';

-- -----------------------------------------------------------------------------
-- The browser-facing half. `core` is not in PostgREST's exposed schemas, so
-- everything a client touches has to have a `public` face.
--
-- Takes no argument, for the same reason current_store_has_module() does not:
-- with no column reference Postgres hoists the call into an InitPlan
-- evaluated once per statement rather than once per row (§19).
-- -----------------------------------------------------------------------------

create or replace function public.current_store_writes_allowed()
returns boolean
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select core.org_writes_allowed(auth_store_id());
$$;

comment on function public.current_store_writes_allowed is
  'Is the calling staff member''s store in a state that permits new records? '
  'Relies on store.id = organization.id, preserved by the Step 3 backfill.';

-- What the client asks in order to render the §08 banner. Deliberately says
-- nothing about WHY beyond the status -- amounts owed and invoices are the
-- billing system's business, not the tenant app's.
create or replace function public.my_store_billing_state()
returns table (
  organization_status text,
  subscription_status text,
  writes_allowed      boolean,
  grace_ends_at       timestamptz
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select
    o.status::text,
    coalesce(s.status, 'NONE'),
    core.org_writes_allowed(o.id),
    -- current_period_end is nullable and nothing in this system has ever set
    -- it -- not the backfill, not grant_default_subscription(), not
    -- platform_set_plan(). Anchoring the window to it alone would make the
    -- deadline NULL for every real tenant, and a banner that cannot name a
    -- date is not much of a warning. updated_at is maintained by trigger on
    -- every status change, so for a tenant just moved to PAST_DUE it is
    -- exactly the moment grace began. Prefer a real period end when a billing
    -- system eventually supplies one.
    case when s.status = 'PAST_DUE'
         then coalesce(s.current_period_end, s.updated_at) + interval '14 days'
    end
  from core.organizations o
  left join core.organization_subscriptions s
    on s.organization_id = o.id and s.status <> 'CANCELLED'
  where o.id = auth_store_id();
$$;

comment on function public.my_store_billing_state is
  'One row for the calling staff member''s own store, or none if they have no '
  'store. grace_ends_at is populated only while PAST_DUE: §08 gives that '
  'state 14 days from the end of the period before suspension is warranted. '
  'Nothing moves the status automatically -- that is an operator action.';

revoke all on function core.org_writes_allowed(uuid)          from public;
revoke all on function public.current_store_writes_allowed()  from public;
revoke all on function public.my_store_billing_state()        from public;

grant execute on function core.org_writes_allowed(uuid)         to authenticated, app_pos, app_inv, app_acc, app_admin;
grant execute on function public.current_store_writes_allowed() to authenticated;
grant execute on function public.my_store_billing_state()       to authenticated;

-- -----------------------------------------------------------------------------
-- The operator control. Without it the ladder is unreachable: nothing else
-- in the system can set a status other than ACTIVE.
-- -----------------------------------------------------------------------------

create or replace function public.platform_set_subscription_status(
  p_org    uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_status text := upper(p_status);
  v_old    text;
  v_sub    uuid;
begin
  if not core.is_platform_admin('BILLING') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  if v_status not in ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED') then
    raise exception 'VALIDATION_FAILED: unknown status %', p_status using errcode = 'P0001';
  end if;

  -- The two states that take away a customer's ability to work are the two
  -- someone will need explained back to them later, possibly by a different
  -- operator, possibly in a dispute. Requiring the note now is cheaper than
  -- reconstructing the reason from a date.
  if v_status in ('SUSPENDED', 'CANCELLED')
     and coalesce(btrim(p_reason), '') = '' then
    raise exception 'VALIDATION_FAILED: a reason is required to set status %', v_status
      using errcode = 'P0001';
  end if;

  select s.id, s.status into v_sub, v_old
  from core.organization_subscriptions s
  where s.organization_id = p_org and s.status <> 'CANCELLED'
  limit 1;

  if v_sub is null then
    raise exception 'VALIDATION_FAILED: no live subscription for that organization'
      using errcode = 'P0001';
  end if;

  update core.organization_subscriptions
     set status       = v_status,
         cancelled_at = case when v_status = 'CANCELLED' then now() else null end,
         notes        = coalesce(p_reason, notes),
         updated_at   = now()
   where id = v_sub;

  -- Note what is NOT done here: organization_modules is untouched. Entitlement
  -- and billing state are separate questions, and a re-activated tenant has to
  -- find their modules exactly as they left them.
  perform core.write_platform_audit(
    'PLATFORM_SET_SUBSCRIPTION_STATUS', 'OrganizationSubscription', p_org,
    jsonb_build_object('status', v_old),
    jsonb_build_object('status', v_status,
                       'writes_allowed', core.org_writes_allowed(p_org)),
    p_reason
  );
end;
$$;

revoke all on function public.platform_set_subscription_status(uuid, text, text) from public;
grant execute on function public.platform_set_subscription_status(uuid, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Fix: changing a plan must not silently un-suspend a tenant.
--
-- platform_set_plan() set status = 'ACTIVE' on every update. Its own lookup
-- filters to status <> 'CANCELLED', so that branch never sees a cancelled
-- row -- which means the assignment could only ever have promoted a SUSPENDED
-- or PAST_DUE tenant back to ACTIVE as a side effect of an unrelated edit.
-- Harmless while status meant nothing. Now it would hand back the very access
-- an operator had just taken away, without appearing in the audit trail as a
-- status change at all.
--
-- Body is otherwise identical to 20260815099000.
-- -----------------------------------------------------------------------------

create or replace function public.platform_set_plan(
  p_org       uuid,
  p_plan_code text,
  p_reason    text default null
)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_plan     uuid;
  v_old_plan text;
  v_sub      uuid;
begin
  if not core.is_platform_admin('BILLING') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  select id into v_plan
  from core.subscription_plans
  where code = upper(p_plan_code) and is_active;

  if v_plan is null then
    raise exception 'VALIDATION_FAILED: unknown or inactive plan %', p_plan_code
      using errcode = 'P0001';
  end if;

  if not exists (select 1 from core.organizations where id = p_org) then
    raise exception 'VALIDATION_FAILED: unknown organization' using errcode = 'P0001';
  end if;

  select s.id, p.code into v_sub, v_old_plan
  from core.organization_subscriptions s
  join core.subscription_plans p on p.id = s.plan_id
  where s.organization_id = p_org and s.status <> 'CANCELLED'
  limit 1;

  if v_sub is null then
    -- No live subscription: the previous one was cancelled, or there never
    -- was one. Starting a fresh ACTIVE subscription is right here -- an
    -- operator deliberately putting a cancelled tenant on a plan is
    -- reinstating them, and that IS the reactivation.
    insert into core.organization_subscriptions (organization_id, plan_id, status, notes)
    values (p_org, v_plan, 'ACTIVE', p_reason);
  else
    -- Plan and billing state are separate decisions. Leave the status alone.
    update core.organization_subscriptions
       set plan_id = v_plan, updated_at = now()
     where id = v_sub;
  end if;

  perform core.materialize_subscription_modules(p_org);

  perform core.write_platform_audit(
    'PLATFORM_SET_PLAN', 'OrganizationSubscription', p_org,
    jsonb_build_object('plan', v_old_plan),
    jsonb_build_object('plan', upper(p_plan_code)),
    p_reason
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- The 21 write policies gated by 20260815095000, each gaining one conjunct.
--
-- Re-created rather than altered because Postgres has no "add a term to a
-- policy". Every definition below is the one currently in the database with
-- `and (select public.current_store_writes_allowed())` appended -- nothing
-- else about them changes, and no read policy is touched anywhere.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- warehouses
-- -----------------------------------------------------------------------------

drop policy "admin can insert warehouses" on warehouses;
create policy "admin can insert warehouses"
  on warehouses for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.warehouse.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can update warehouses" on warehouses;
create policy "admin can update warehouses"
  on warehouses for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.warehouse.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can delete warehouses" on warehouses;
create policy "admin can delete warehouses"
  on warehouses for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.warehouse.manage'))
    and not is_default
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

-- -----------------------------------------------------------------------------
-- warehouse_stock
-- -----------------------------------------------------------------------------

drop policy "admin can upsert warehouse stock" on warehouse_stock;
create policy "admin can upsert warehouse stock"
  on warehouse_stock for insert
  with check (
    exists (
      select 1 from warehouses
      where warehouses.id = warehouse_stock.warehouse_id
        and warehouses.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can update warehouse stock" on warehouse_stock;
create policy "admin can update warehouse stock"
  on warehouse_stock for update
  using (
    exists (
      select 1 from warehouses
      where warehouses.id = warehouse_stock.warehouse_id
        and warehouses.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

-- -----------------------------------------------------------------------------
-- purchase_orders / purchase_order_lines
-- -----------------------------------------------------------------------------

drop policy "admin can insert purchase orders" on purchase_orders;
create policy "admin can insert purchase orders"
  on purchase_orders for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    and created_by = auth.uid()
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can update purchase orders" on purchase_orders;
create policy "admin can update purchase orders"
  on purchase_orders for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can delete purchase orders" on purchase_orders;
create policy "admin can delete purchase orders"
  on purchase_orders for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    and status = 'draft'
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can insert purchase order lines" on purchase_order_lines;
create policy "admin can insert purchase order lines"
  on purchase_order_lines for insert
  with check (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_lines.purchase_order_id
        and purchase_orders.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    )
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can update purchase order lines" on purchase_order_lines;
create policy "admin can update purchase order lines"
  on purchase_order_lines for update
  using (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_lines.purchase_order_id
        and purchase_orders.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    )
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can delete purchase order lines" on purchase_order_lines;
create policy "admin can delete purchase order lines"
  on purchase_order_lines for delete
  using (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_lines.purchase_order_id
        and purchase_orders.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    )
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

-- -----------------------------------------------------------------------------
-- product_unit_conversions
-- -----------------------------------------------------------------------------

drop policy "admin can insert unit conversions" on product_unit_conversions;
create policy "admin can insert unit conversions"
  on product_unit_conversions for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.product.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can update unit conversions" on product_unit_conversions;
create policy "admin can update unit conversions"
  on product_unit_conversions for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.product.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can delete unit conversions" on product_unit_conversions;
create policy "admin can delete unit conversions"
  on product_unit_conversions for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.product.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

-- -----------------------------------------------------------------------------
-- inventory_beginning_balances
-- -----------------------------------------------------------------------------

drop policy "admin can insert beginning balances" on inventory_beginning_balances;
create policy "admin can insert beginning balances"
  on inventory_beginning_balances for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.adjust'))
    and created_by = auth.uid()
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can update beginning balances" on inventory_beginning_balances;
create policy "admin can update beginning balances"
  on inventory_beginning_balances for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.adjust'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can delete beginning balances" on inventory_beginning_balances;
create policy "admin can delete beginning balances"
  on inventory_beginning_balances for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.adjust'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

-- -----------------------------------------------------------------------------
-- inventory_counts / inventory_count_lines
-- -----------------------------------------------------------------------------

drop policy "admin can insert inventory counts" on inventory_counts;
create policy "admin can insert inventory counts"
  on inventory_counts for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.count'))
    and created_by = auth.uid()
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can update inventory counts" on inventory_counts;
create policy "admin can update inventory counts"
  on inventory_counts for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.count'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can insert inventory count lines" on inventory_count_lines;
create policy "admin can insert inventory count lines"
  on inventory_count_lines for insert
  with check (
    exists (
      select 1 from inventory_counts
      where inventory_counts.id = inventory_count_lines.inventory_count_id
        and inventory_counts.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.stock.count'))
    )
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can update inventory count lines" on inventory_count_lines;
create policy "admin can update inventory count lines"
  on inventory_count_lines for update
  using (
    exists (
      select 1 from inventory_counts
      where inventory_counts.id = inventory_count_lines.inventory_count_id
        and inventory_counts.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.stock.count'))
    )
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
  );

-- -----------------------------------------------------------------------------
-- transfer_stock: warehouse_transfers has no client INSERT policy -- every
-- transfer is written inside this SECURITY DEFINER function, which bypasses
-- RLS. The gate therefore has to live in the function itself, and it can
-- raise the real error code from Architecture v1 §22 rather than the opaque
-- "violates row-level security policy" a policy denial produces.
-- -----------------------------------------------------------------------------

create or replace function transfer_stock(
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_notes text default null
)
returns table (transfer_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_from warehouses%rowtype;
  v_to warehouses%rowtype;
  v_product_store_id uuid;
  v_from_stock integer;
  v_transfer_id uuid;
begin
  select store_id into v_store_id from staff where id = auth.uid();
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if not has_permission('inventory.transfer.manage') then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  if not core.module_enabled(v_store_id, 'INVENTORY') then
    raise exception 'MODULE_NOT_ENABLED';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid quantity';
  end if;

  if p_from_warehouse_id = p_to_warehouse_id then
    raise exception 'Source and destination warehouses must be different';
  end if;

  select * into v_from from warehouses where id = p_from_warehouse_id and store_id = v_store_id;
  if not found then
    raise exception 'Source warehouse not found';
  end if;

  select * into v_to from warehouses where id = p_to_warehouse_id and store_id = v_store_id;
  if not found then
    raise exception 'Destination warehouse not found';
  end if;

  select store_id into v_product_store_id from products where id = p_product_id;
  if v_product_store_id is null or v_product_store_id <> v_store_id then
    raise exception 'Product not found in this store';
  end if;

  if v_from.is_default then
    select stock into v_from_stock from products where id = p_product_id for update;
    if v_from_stock < p_quantity then
      raise exception 'Insufficient stock at source warehouse';
    end if;
    update products set stock = stock - p_quantity, updated_at = now() where id = p_product_id;
  else
    insert into warehouse_stock (warehouse_id, product_id, quantity)
      values (p_from_warehouse_id, p_product_id, 0)
      on conflict (warehouse_id, product_id) do nothing;

    select quantity into v_from_stock from warehouse_stock
      where warehouse_id = p_from_warehouse_id and product_id = p_product_id
      for update;
    if v_from_stock < p_quantity then
      raise exception 'Insufficient stock at source warehouse';
    end if;
    update warehouse_stock set quantity = quantity - p_quantity, updated_at = now()
      where warehouse_id = p_from_warehouse_id and product_id = p_product_id;
  end if;

  if v_to.is_default then
    update products set stock = stock + p_quantity, updated_at = now() where id = p_product_id;
  else
    insert into warehouse_stock (warehouse_id, product_id, quantity)
      values (p_to_warehouse_id, p_product_id, p_quantity)
      on conflict (warehouse_id, product_id)
      do update set quantity = warehouse_stock.quantity + excluded.quantity, updated_at = now();
  end if;

  insert into warehouse_transfers (
    store_id, from_warehouse_id, to_warehouse_id, product_id, quantity, notes, created_by
  )
    values (v_store_id, p_from_warehouse_id, p_to_warehouse_id, p_product_id, p_quantity, p_notes, auth.uid())
    returning id into v_transfer_id;

  return query select v_transfer_id;
end;
$$;
