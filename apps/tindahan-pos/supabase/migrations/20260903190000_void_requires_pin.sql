-- =============================================================================
-- Enforce "Void needs PIN" server-side (closes #470, part 1 of 2)
-- -----------------------------------------------------------------------------
-- Settings -> Fees & limits has rendered a "Void needs PIN" toggle since the
-- fees/limits redesign, backed only by feesLimitsMock.ts's localStorage
-- persistence. It looked like a working control -- it flips, it saves, it
-- survives a reload -- and did nothing: void_sale() has never read it, so a
-- Supervisor (the only non-Owner role that holds pos.sale.void -- CASHIER
-- has no permissions at all under 0044's RBAC seed) could always void a sale
-- unaccompanied, toggle on or off.
--
-- THE FIX, matching the pattern already proven for the credit-limit override
-- (20260815147000 / 20260903100000): a real, boolean store column, checked
-- inside the function that actually performs the sensitive write, requiring
-- a short-lived single-use token from check_credit_override_pin() rather
-- than a raw PIN void_sale() would have to hash-compare (and could not rate-
-- limit for the reason 20260815147000 documents: a counter written before a
-- `raise exception` in the same function is rolled back with it).
--
-- check_credit_override_pin() is reused as-is rather than renamed or
-- duplicated. Its job -- "an admin of this store typed their PIN just now,
-- here is a 5-minute single-use receipt of that" -- is not actually specific
-- to credit; the name is a historical accident of what needed it first. A
-- fresh function would re-implement the exact same crypt()/lockout/token
-- bookkeeping 20260815147000 already got right, for no behavioural gain, and
-- would itself need the six-migration overgrant sweep this codebase has
-- already paid for once (see SEC-002/SEC-007 in the audit).
--
-- Owners are exempt: the toggle protects against a Supervisor voiding
-- without oversight, not against an Owner approving their own action, and
-- credit_override_tokens.approved_by must itself be an admin's PIN, so
-- requiring one from an Owner acting alone would be circular.
--
-- Scope note: the same p_override_token also guards the credit-limit
-- override inside checkout_sale(), and a token is single-use. A sale that
-- somehow needed both in the same call would need two approvals, sequenced.
-- That combination cannot happen for a void specifically (void_sale() and
-- checkout_sale() are different calls, on an already-completed sale), so it
-- does not arise here.
--
-- Affected modules : POS, settings
-- Rollback         : alter table stores drop column void_requires_pin;
--                    restore void_sale(uuid, text) from 20260815111000.
-- Risk             : low -- additive column (default false, so every
--                    existing store's behaviour is unchanged until an Owner
--                    opts in), and the new parameter on void_sale() has a
--                    default, so an old client keeps working exactly as
--                    before for any store that leaves the toggle off.
-- =============================================================================

alter table stores add column void_requires_pin boolean not null default false;

create or replace function void_sale(p_sale_id uuid, p_reason text, p_override_token text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store_id uuid;
  v_sale sales%rowtype;
  v_reason text;
  v_item record;
  v_void_requires_pin boolean;
  v_token_row credit_override_tokens%rowtype;
begin
  v_store_id := auth_store_id();
  if v_store_id is null then raise exception 'Not a registered staff member of any store'; end if;

  if not has_permission('pos.sale.void') then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  -- The store must also have bought the capability. Permission answers "may
  -- THIS PERSON", entitlement answers "did this TENANT pay for it" -- both
  -- have to hold, and conflating them is how a feature ends up enforced for
  -- cashiers but not owners.
  if not public.current_store_has_feature('pos.void') then
    raise exception 'FEATURE_NOT_ENABLED: pos.void' using errcode = 'P0001';
  end if;

  select void_requires_pin into v_void_requires_pin from stores where id = v_store_id;
  if v_void_requires_pin and auth_role() <> 'admin' then
    if p_override_token is null then
      raise exception 'VOID_PIN_REQUIRED';
    end if;
    select * into v_token_row from credit_override_tokens
      where store_id = v_store_id
        and cashier_id = auth.uid()
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

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'VOID_REASON_REQUIRED';
  end if;

  select * into v_sale from sales where id = p_sale_id and store_id = v_store_id for update;
  if not found then
    raise exception 'Sale not found in this store';
  end if;
  if v_sale.status = 'voided' then
    raise exception 'ALREADY_VOIDED';
  end if;

  for v_item in
    select product_id, quantity from sale_items
      where sale_id = p_sale_id and item_type = 'product' and product_id is not null
  loop
    update products set stock = stock + v_item.quantity, updated_at = now()
      where id = v_item.product_id;
  end loop;

  if v_sale.payment_type = 'credit' and v_sale.customer_id is not null then
    perform 1 from customers where id = v_sale.customer_id and store_id = v_store_id for update;
    update customers set balance = balance - v_sale.total where id = v_sale.customer_id;
  end if;

  update sales
    set status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = v_reason
    where id = p_sale_id;

  insert into audit_log (store_id, actor_id, action, entity_type, entity_id, previous_value, new_value, reason)
    values (
      v_store_id, auth.uid(), 'sale_voided', 'sale', p_sale_id,
      jsonb_build_object('status', 'completed'),
      jsonb_build_object('status', 'voided'),
      v_reason
    );
end;
$$;

-- This CREATE OR REPLACE grows void_sale(uuid, text)'s existing signature by
-- one appended, defaulted parameter -- the same mechanism checkout_sale()
-- has used across every migration that added a parameter to it (most
-- recently p_override_token itself, in 20260903100000). Postgres replaces
-- the function in place (same OID, same ACL) rather than creating a second
-- overload, so an old client still calling void_sale(p_sale_id, p_reason)
-- keeps resolving to this same function with p_override_token defaulting to
-- null -- exactly today's behaviour unless a store has since turned the
-- toggle on, in which case it correctly gets VOID_PIN_REQUIRED, the same as
-- an old client hitting any other new server-side check.
revoke all on function void_sale(uuid, text, text) from public, anon, service_role;
grant execute on function void_sale(uuid, text, text) to authenticated;

-- The two-argument form has to go, or both exist and every existing call --
-- void_sale(id, reason) -- becomes ambiguous: "function void_sale(uuid,
-- unknown) is not unique". p_override_token defaults to null, so the new
-- signature covers those callers exactly as before.
--
-- Dropped AFTER the grant above rather than before, so there is no window in
-- which no callable void_sale exists.
drop function if exists void_sale(uuid, text);
