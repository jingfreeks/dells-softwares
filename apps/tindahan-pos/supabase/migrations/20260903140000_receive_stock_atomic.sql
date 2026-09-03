-- receive_stock() -- make receiving one transaction (issue #462)
--
-- receiveStock() in the client raised stock for every line and THEN wrote the
-- receiving record:
--
--   for (const line of lines) await restock(line.productId, line.quantity);
--   ... resolve the default warehouse
--   insert into receiving_entries ...        <- can fail
--
-- Not one transaction, and no compensating write. If the insert failed, the
-- stock had already moved and there was no receiving entry to explain it.
--
-- This is reachable without any misuse, because the two steps are guarded by
-- DIFFERENT conditions:
--
--   adjust_product_stock()        requires inventory.product.manage
--   receiving_entries INSERT      requires inventory.stock.receive AND
--                                 current_store_has_feature('inventory.receiving')
--                                 AND current_store_has_module('INVENTORY')
--                                 AND current_store_writes_allowed()
--
-- So a supervisor at a store whose receiving feature was revoked, whose
-- INVENTORY module was turned off, or whose subscription is suspended would
-- raise stock on every line and then be told the save failed. Inventory drifts
-- upward, the record that would explain it is missing, and a retry adds the
-- quantities again.
--
-- THE FIX: one SECURITY DEFINER function. Everything is validated first, the
-- receiving rows are written, and only then does stock move -- all in one
-- transaction, so a failure anywhere leaves nothing behind.
--
-- WHY THE ENTITLEMENT CHECKS ARE REPEATED HERE, EXPLICITLY
--
-- They are not redundant. postgres owns these tables, so RLS does not apply to
-- it, and a SECURITY DEFINER function therefore does NOT get the INSERT
-- policy's feature/module/writes conditions for free. Moving the insert into
-- this function without restating them would silently drop three entitlement
-- gates -- turning a bug about ordering into a much worse one about billing.
--
-- Affected modules : INVENTORY
-- Rollback         : drop function receive_stock(text, date, jsonb, uuid, text);
-- Risk             : medium -- the write path for all receiving.

create or replace function receive_stock(
  p_supplier    text,
  p_received_on date,
  p_lines       jsonb,
  p_supplier_id uuid default null,
  p_dr_number   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_store_id     uuid;
  v_staff_id     uuid := auth.uid();
  v_warehouse_id uuid;
  v_entry_id     uuid;
  v_paid         boolean;
  v_terms        text;
  v_line         jsonb;
  v_product_id   uuid;
  v_quantity     integer;
  v_reason       text;
begin
  select store_id into v_store_id from staff where id = v_staff_id;
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if not (auth_role() = 'admin' or has_permission('inventory.stock.receive')) then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  -- The three gates RLS would have applied to a direct insert. See the header:
  -- they do not apply inside this function, so they are applied by hand.
  if not public.current_store_has_module('INVENTORY') then
    raise exception 'MODULE_NOT_ENABLED: INVENTORY';
  end if;
  if not public.current_store_has_feature('inventory.receiving') then
    raise exception 'FEATURE_NOT_ENABLED: inventory.receiving';
  end if;
  if not public.current_store_writes_allowed() then
    raise exception 'ORG_WRITES_SUSPENDED';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'NO_RECEIVING_LINES';
  end if;

  select id into v_warehouse_id
    from warehouses
   where store_id = v_store_id and is_default
   limit 1;
  if v_warehouse_id is null then
    raise exception 'NO_DEFAULT_WAREHOUSE';
  end if;

  -- Cash, or an ad-hoc supplier with no saved record, is paid on delivery by
  -- definition; a term-based supplier starts unpaid. Unchanged from the client.
  if p_supplier_id is null then
    v_paid := true;
  else
    select payment_terms into v_terms from suppliers
     where id = p_supplier_id and store_id = v_store_id;
    if v_terms is null then
      raise exception 'Supplier not found in this store';
    end if;
    v_paid := (v_terms = 'cash');
  end if;

  insert into receiving_entries (
    store_id, supplier, supplier_id, warehouse_id, dr_number,
    paid, paid_at, received_on, created_by
  ) values (
    v_store_id,
    coalesce(nullif(trim(p_supplier), ''), 'Unspecified supplier'),
    p_supplier_id, v_warehouse_id, nullif(trim(coalesce(p_dr_number, '')), ''),
    v_paid, case when v_paid then now() end, p_received_on, v_staff_id
  )
  returning id into v_entry_id;

  insert into receiving_lines (receiving_entry_id, product_id, product_name, quantity, cost_each)
  select v_entry_id,
         (line ->> 'product_id')::uuid,
         line ->> 'product_name',
         (line ->> 'quantity')::integer,
         coalesce((line ->> 'cost_each')::numeric, 0)
    from jsonb_array_elements(p_lines) as line;

  -- Stock moves LAST, and only once everything above has succeeded.
  --
  -- Through adjust_product_stock() rather than a direct update: it keeps one
  -- path for every stock change, validates that the product belongs to this
  -- store, and writes the audit row that a receiving would otherwise lose.
  -- Note this couples receiving to inventory.product.manage, which that
  -- function requires -- both roles that can receive (Owner, Supervisor) hold
  -- it, and a role that could receive without it should be granted it rather
  -- than have this call bypassed.
  v_reason := 'Receiving' ||
              coalesce(' DR ' || nullif(trim(coalesce(p_dr_number, '')), ''), '') ||
              coalesce(' from ' || nullif(trim(p_supplier), ''), '');

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_product_id := (v_line ->> 'product_id')::uuid;
    v_quantity   := (v_line ->> 'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid quantity';
    end if;
    if v_product_id is not null then
      perform adjust_product_stock(v_product_id, v_quantity, v_reason);
    end if;
  end loop;

  return v_entry_id;
end;
$function$;

revoke all on function receive_stock(text, date, jsonb, uuid, text)
  from public, anon, service_role;
grant execute on function receive_stock(text, date, jsonb, uuid, text)
  to authenticated;
