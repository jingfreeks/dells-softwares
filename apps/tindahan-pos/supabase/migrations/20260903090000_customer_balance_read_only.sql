-- customers.balance and customers.credit_limit become RPC-maintained only.
--
-- The hole: the sole UPDATE policy on customers is
--
--   "admin can update store customers"
--   using (store_id = auth_store_id() and auth_role() = 'admin')
--
-- which is column-unrestricted. Any store admin could PATCH
-- /rest/v1/customers?id=eq.<id> with {"balance": 0} and clear a customer's
-- utang, or raise their own credit_limit, leaving no trace anywhere -- the
-- only trigger on the table was trg_customers_log_delete, which records
-- deletes and nothing else.
--
-- Why it matters beyond the ledger being wrong: checkout_sale() reads BOTH
-- columns to enforce the credit limit. They are not display values, they are
-- the inputs to an authorisation decision, and they were writable by the
-- party the decision is made about.
--
-- Both columns are maintained by four SECURITY DEFINER functions owned by
-- postgres -- checkout_sale, record_credit_payment, refund_sale_items and
-- void_sale. Nothing in the client ever updates customers at all: the app
-- only INSERTs (addCustomer, which sets credit_limit at creation) and
-- SELECTs. So closing direct writes costs the application nothing today.
--
-- INSERT is covered as well as UPDATE. balance defaults to 0 and the client
-- never sends it, but an admin could otherwise create a customer with a
-- negative opening balance and manufacture credit headroom -- the same
-- attack as editing the balance, one step earlier.
--
-- credit_limit stays settable at INSERT, because that is the real creation
-- path. If an "edit customer" screen is ever added, changing a limit needs an
-- audited RPC rather than relaxing this trigger -- a limit change is exactly
-- the kind of decision the audit trail should carry.

create or replace function reject_customer_ledger_write()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  -- Only the PostgREST client roles are defended against. Migrations and the
  -- four SECURITY DEFINER RPCs run as the owner, and must pass through --
  -- they are the supported way these columns move.
  if current_user not in ('authenticated', 'anon', 'service_role') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.balance, 0) <> 0 then
      raise exception 'CUSTOMER_BALANCE_READ_ONLY'
        using errcode = '42501',
              hint = 'balance is maintained by checkout_sale, record_credit_payment, refund_sale_items and void_sale. A customer is created with a zero balance.';
    end if;
    return new;
  end if;

  if new.balance is distinct from old.balance then
    raise exception 'CUSTOMER_BALANCE_READ_ONLY'
      using errcode = '42501',
            hint = 'record a credit payment or a sale instead of writing the balance directly.';
  end if;

  if new.credit_limit is distinct from old.credit_limit then
    raise exception 'CUSTOMER_CREDIT_LIMIT_READ_ONLY'
      using errcode = '42501',
            hint = 'the credit limit is set when the customer is created; changing it needs an audited RPC.';
  end if;

  return new;
end;
$function$;

-- No grants here on purpose: this returns trigger, and Postgres refuses a
-- direct call to a trigger function, so EXECUTE on it is not reachable from a
-- client. See scripts/check-function-grants.sh, which excludes them for the
-- same reason.

drop trigger if exists trg_customers_ledger_read_only on customers;

create trigger trg_customers_ledger_read_only
  before insert or update on customers
  for each row execute function reject_customer_ledger_write();
