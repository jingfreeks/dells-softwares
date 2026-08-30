-- =============================================================================
-- Recent payments across all customers, with a real settled/partial status
-- -----------------------------------------------------------------------------
-- The Customers page's "Recent payments" card has been rendering hardcoded
-- mock rows (see src/pages/Customers/component/recentpaymentscard) because
-- there was no way to build a real cross-customer feed: credit_payments had
-- no record of what the customer's balance became after each payment, so
-- "settled" vs "partial" couldn't be derived after the fact, and there was
-- no index to page through a store's payments by recency without a
-- customer_id filter.
--
-- resulting_balance is a point-in-time snapshot, not something to compute
-- live -- a customer's *current* balance moves on, but "was this payment
-- the one that zeroed them out at the time" is fixed forever.
-- =============================================================================

alter table credit_payments
  add column resulting_balance numeric(10, 2);

create index credit_payments_store_id_created_at_idx
  on credit_payments (store_id, created_at desc);

create or replace function record_credit_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_note text default null
)
returns table (customer_id uuid, new_balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_staff_id uuid := auth.uid();
  v_customer customers%rowtype;
  v_new_balance numeric;
begin
  select store_id into v_store_id from staff where id = v_staff_id;
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  select * into v_customer from customers
    where id = p_customer_id and store_id = v_store_id
    for update;
  if not found then
    raise exception 'Customer not found in this store';
  end if;

  v_new_balance := v_customer.balance - p_amount;

  insert into credit_payments (store_id, customer_id, amount, note, created_by, resulting_balance)
    values (v_store_id, p_customer_id, p_amount, nullif(trim(coalesce(p_note, '')), ''), v_staff_id, v_new_balance);

  update customers set balance = v_new_balance where id = p_customer_id;

  return query select p_customer_id, v_new_balance;
end;
$$;
