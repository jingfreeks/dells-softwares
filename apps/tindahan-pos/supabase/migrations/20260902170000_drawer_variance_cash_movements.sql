-- =============================================================================
-- Count every cash movement in the drawer variance
-- -----------------------------------------------------------------------------
-- Closes issue #452. end_cashier_session() computed
--
--   expected = opening_float + completed cash sales
--
-- and two other things move cash through the same drawer:
--
--   credit_payments  a customer settling their utang -- cash IN
--   refunds          money handed back              -- cash OUT
--
-- Neither was counted, so a shift that collected P500 of utang reported a
-- P500 overage and one that refunded P200 reported a P200 shortage.
--
-- This is not an edge case in a sari-sari store. Utang collection is routine,
-- which means the variance was wrong on a normal day rather than a rare one.
-- The failure is also asymmetric in the direction that matters: P500 of
-- collected utang would mask P500 genuinely missing. A variance that is
-- systematically wrong is worse than none -- it manufactures suspicion on a
-- good shift and hides a real shortfall on a bad one.
--
-- Scoping matches the existing sales query exactly: this store, this
-- session's window, and this cashier. credit_payments.created_by and
-- refunds.actor_id are the cashier columns.
--
-- ASSUMPTION, stated rather than implied: neither table records a payment
-- method, so this treats utang settlements and refunds as cash. That is the
-- norm for a sari-sari store and it is what the drawer figure means. If a
-- non-cash settlement is ever added, this calculation must change with it,
-- or the variance silently goes wrong again in the other direction.
--
-- The audit row now carries the components, not just the result. A cashier
-- disputing a variance can be shown how it was reached instead of being
-- handed a number.
--
-- Affected modules : POS, cash management
-- Rollback         : restore the previous definition from 20260815145000.
-- Risk             : low -- changes a reported figure, writes no new state.
--                    Sessions closed before this keep the variance they were
--                    given; nothing is recomputed retrospectively.
-- =============================================================================

create or replace function end_cashier_session(
  p_token text,
  p_closing_float numeric default null::numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_session cashier_sessions%rowtype;
  v_cash_sales numeric;
  v_credit_payments numeric;
  v_refunds numeric;
  v_expected numeric;
begin
  select * into v_session from cashier_sessions
    where token = p_token and store_id = auth_store_id() and revoked_at is null
    for update;
  if not found then
    return;
  end if;

  if p_closing_float is null then
    update cashier_sessions set revoked_at = now() where id = v_session.id;
    insert into audit_log (store_id, actor_id, action, entity_type, entity_id)
      values (v_session.store_id, v_session.staff_id, 'cashier_session_ended', 'staff', v_session.staff_id);
    return;
  end if;

  select coalesce(sum(total), 0) into v_cash_sales
    from sales
    where cashier_id = v_session.staff_id
      and store_id = v_session.store_id
      and payment_type = 'cash'
      and status = 'completed'
      and created_at >= v_session.created_at
      and created_at <= now();

  -- Cash in: utang settled at the counter during this shift.
  select coalesce(sum(amount), 0) into v_credit_payments
    from credit_payments
    where created_by = v_session.staff_id
      and store_id = v_session.store_id
      and created_at >= v_session.created_at
      and created_at <= now();

  -- Cash out: money handed back during this shift.
  select coalesce(sum(total_amount), 0) into v_refunds
    from refunds
    where actor_id = v_session.staff_id
      and store_id = v_session.store_id
      and created_at >= v_session.created_at
      and created_at <= now();

  v_expected := coalesce(v_session.opening_float, 0)
              + v_cash_sales
              + v_credit_payments
              - v_refunds;

  update cashier_sessions
    set revoked_at = now(),
        closing_float = p_closing_float,
        expected_closing = v_expected,
        variance = p_closing_float - v_expected
    where id = v_session.id;

  insert into audit_log (store_id, actor_id, action, entity_type, entity_id, new_value)
    values (
      v_session.store_id, v_session.staff_id, 'cashier_session_ended', 'staff', v_session.staff_id,
      jsonb_build_object(
        'closing_float', p_closing_float,
        'expected_closing', v_expected,
        'variance', p_closing_float - v_expected,
        -- How the expected figure was reached, so a disputed variance can be
        -- explained rather than merely asserted.
        'opening_float', coalesce(v_session.opening_float, 0),
        'cash_sales', v_cash_sales,
        'credit_payments', v_credit_payments,
        'refunds', v_refunds
      )
    );
end;
$function$;
