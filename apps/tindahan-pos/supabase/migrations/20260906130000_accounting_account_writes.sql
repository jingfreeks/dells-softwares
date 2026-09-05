-- Accounting, chunk B3b: adding, editing and deactivating an account
--
-- A2 gave accounting.accounts a reader and a seeder and no way to write one.
-- The schema is deliberately not exposed to PostgREST, so a client had nothing
-- to call, and B3's Chart of Accounts screen shipped without the Add, Edit and
-- Deactivate the design gives it. That was an omission in A2, not a decision.
--
-- Three rules the design states, now enforced where they hold:
--
--   * an account an integration posts to is deactivated, never deleted
--     -- already true since A2: no delete policy passes an is_system row
--   * a system account cannot be renamed to a different TYPE
--   * an inactive account cannot be posted to
--
-- THE THIRD ONE IS NOT COSMETIC, AND IT CHANGES B2
--
-- Deactivation means nothing unless posting checks it. Without this, switching
-- Cash on Hand off would leave every integration posting into it exactly as
-- before, and the only thing that changed would be a badge on a screen. So the
-- journal lifecycle trigger now also refuses to post an entry whose lines name
-- an inactive account. Replacing the function rather than dropping it keeps
-- its ACL, which for a trigger function is "nobody".
--
-- A SYSTEM ACCOUNT'S CODE IS FROZEN TOO
--
-- The design only says the type cannot change. But planning §8 says not to
-- hard-code account NAMES, which is why every integration resolves accounts by
-- CODE -- and a code that can be edited is a name by another route. Renaming
-- 1010 to 1015 would silently redirect every future cash posting. Frozen, with
-- the reason in the error.
--
-- Affected schemas : accounting (1 trigger function replaced),
--                    public (3 functions)
-- Rollback         : drop function public.create_account(text,text,text,text,text);
--                    drop function public.update_account(uuid,text,text,text,text);
--                    drop function public.set_account_active(uuid,boolean);
--                    -- and restore enforce_journal_lifecycle from 20260906120000
-- Risk             : low-medium. The lifecycle change tightens an existing
--                    rule: an entry that would have posted against an inactive
--                    account now will not. No account is inactive today --
--                    nothing has been able to deactivate one -- so nothing
--                    currently postable stops being postable.

-- -----------------------------------------------------------------------------
-- Posting to an inactive account
-- -----------------------------------------------------------------------------

create or replace function accounting.enforce_journal_lifecycle()
returns trigger
language plpgsql
set search_path = accounting, public, pg_temp
as $$
declare
  v_debit    numeric(14, 2);
  v_credit   numeric(14, 2);
  v_lines    integer;
  v_inactive text;
begin
  if old.status = 'POSTED' and new.status <> 'REVERSED' then
    raise exception 'ENTRY_IS_POSTED' using errcode = 'P0001',
      hint = 'Correct a posted entry by posting a reversing entry';
  end if;
  if old.status = 'REVERSED' then
    raise exception 'ENTRY_IS_REVERSED' using errcode = 'P0001';
  end if;

  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'DRAFT'     and new.status in ('VALIDATED', 'POSTED'))
    or (old.status = 'VALIDATED' and new.status in ('DRAFT', 'POSTED'))
    or (old.status = 'POSTED'    and new.status = 'REVERSED')
  ) then
    raise exception 'ILLEGAL_TRANSITION' using errcode = 'P0001',
      hint = old.status::text || ' -> ' || new.status::text;
  end if;

  if new.status = 'POSTED' then
    select coalesce(sum(debit), 0), coalesce(sum(credit), 0), count(*)
      into v_debit, v_credit, v_lines
      from accounting.journal_lines where entry_id = new.id;

    if v_lines < 2 then
      raise exception 'ENTRY_NEEDS_TWO_LINES' using errcode = 'P0001';
    end if;
    if v_debit <> v_credit then
      raise exception 'ENTRY_NOT_BALANCED' using errcode = 'P0001',
        hint = 'debits ' || v_debit::text || ' vs credits ' || v_credit::text;
    end if;

    if not accounting.posting_allowed(new.organization_id, new.entry_date) then
      raise exception 'PERIOD_NOT_OPEN' using errcode = 'P0001',
        hint = new.entry_date::text;
    end if;

    -- New in B3b. Deactivation is meaningless if posting ignores it.
    select string_agg(a.code, ', ' order by a.code) into v_inactive
      from accounting.journal_lines l
      join accounting.accounts a on a.id = l.account_id
     where l.entry_id = new.id and not a.active;
    if v_inactive is not null then
      raise exception 'ACCOUNT_INACTIVE' using errcode = 'P0001', hint = v_inactive;
    end if;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Adding an account
-- -----------------------------------------------------------------------------

create or replace function public.create_account(
  p_code           text,
  p_name           text,
  p_type           text,
  p_normal_balance text,
  p_parent_code    text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org    uuid := auth_store_id();
  v_parent uuid;
  v_id     uuid;
begin
  if v_org is null then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001', hint = 'No store in session';
  end if;
  if not public.current_store_has_module('ACCOUNTING') then
    raise exception 'MODULE_NOT_AVAILABLE' using errcode = 'P0001', hint = 'ACCOUNTING';
  end if;

  if p_parent_code is not null then
    select id into v_parent from accounting.accounts
     where organization_id = v_org and code = btrim(p_parent_code);
    if v_parent is null then
      raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001', hint = btrim(p_parent_code);
    end if;
  end if;

  -- security invoker: the insert policy is what authorises this, so a caller
  -- without accounting.account.manage is refused by RLS rather than by a check
  -- this function could forget.
  insert into accounting.accounts
    (organization_id, code, name, type, normal_balance, parent_id)
  values (
    v_org, btrim(p_code), btrim(p_name),
    p_type::accounting.account_type,
    p_normal_balance::accounting.normal_balance,
    v_parent
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.create_account is
  'Add an account. is_system is never settable by a caller -- an account only '
  'becomes a system account by being one an integration posts to.';

-- -----------------------------------------------------------------------------
-- Editing an account
-- -----------------------------------------------------------------------------

create or replace function public.update_account(
  p_id             uuid,
  p_code           text,
  p_name           text,
  p_type           text,
  p_normal_balance text,
  p_parent_code    text default null
)
returns void
language plpgsql
security invoker
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org     uuid := auth_store_id();
  v_account accounting.accounts;
  v_parent  uuid;
  v_walk    uuid;
  v_hops    integer := 0;
begin
  select * into v_account from accounting.accounts
   where id = p_id and organization_id = v_org;
  if v_account.id is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_account.is_system then
    if p_type::accounting.account_type <> v_account.type then
      raise exception 'SYSTEM_ACCOUNT_TYPE_FIXED' using errcode = 'P0001',
        hint = 'An integration posts to this account and expects its type';
    end if;
    if btrim(p_code) <> v_account.code then
      raise exception 'SYSTEM_ACCOUNT_CODE_FIXED' using errcode = 'P0001',
        hint = 'Integrations resolve this account by its code';
    end if;
  end if;

  if p_parent_code is not null then
    select id into v_parent from accounting.accounts
     where organization_id = v_org and code = btrim(p_parent_code);
    if v_parent is null then
      raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001', hint = btrim(p_parent_code);
    end if;

    -- Walk up from the proposed parent. If we arrive back at this account, the
    -- chart would contain a loop, and every later report that walks the tree
    -- would run forever rather than fail.
    v_walk := v_parent;
    while v_walk is not null loop
      if v_walk = p_id then
        raise exception 'PARENT_WOULD_LOOP' using errcode = 'P0001';
      end if;
      v_hops := v_hops + 1;
      if v_hops > 64 then
        raise exception 'PARENT_WOULD_LOOP' using errcode = 'P0001',
          hint = 'Parent chain is implausibly deep';
      end if;
      select parent_id into v_walk from accounting.accounts where id = v_walk;
    end loop;
  end if;

  update accounting.accounts
     set code = btrim(p_code),
         name = btrim(p_name),
         type = p_type::accounting.account_type,
         normal_balance = p_normal_balance::accounting.normal_balance,
         parent_id = v_parent,
         updated_at = now()
   where id = p_id;
end;
$$;

comment on function public.update_account is
  'Edit an account. A system account keeps its code and its type: an '
  'integration resolves it by code and posts to it expecting that type.';

-- -----------------------------------------------------------------------------
-- Deactivating and reactivating
-- -----------------------------------------------------------------------------

create or replace function public.set_account_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security invoker
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org     uuid := auth_store_id();
  v_account accounting.accounts;
  v_kids    integer;
begin
  select * into v_account from accounting.accounts
   where id = p_id and organization_id = v_org;
  if v_account.id is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- A group heading with live children under it must not be switched off: the
  -- children would keep taking postings while their parent read as inactive,
  -- which is a chart that lies about itself.
  if not p_active then
    select count(*) into v_kids from accounting.accounts
     where organization_id = v_org and parent_id = p_id and active;
    if v_kids > 0 then
      raise exception 'ACCOUNT_HAS_ACTIVE_CHILDREN' using errcode = 'P0001',
        hint = v_kids::text || ' active account(s) sit under this one';
    end if;
  end if;

  update accounting.accounts
     set active = p_active, updated_at = now()
   where id = p_id;
end;
$$;

comment on function public.set_account_active is
  'Deactivate or reactivate an account. Deactivating is what replaces deleting '
  'for an account an integration posts to -- and it now means something, '
  'because posting to an inactive account is refused.';

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

revoke all on function public.create_account(text, text, text, text, text)      from public, anon;
revoke all on function public.update_account(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.set_account_active(uuid, boolean)                  from public, anon;
grant execute on function public.create_account(text, text, text, text, text)      to authenticated;
grant execute on function public.update_account(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.set_account_active(uuid, boolean)                  to authenticated;
