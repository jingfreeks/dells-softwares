-- =============================================================================
-- Phase 2 · Migration 010 · auth.users -> core.users mirror
-- -----------------------------------------------------------------------------
-- Supabase owns auth.users. This keeps core.users in step so the rest of the
-- platform can foreign-key against a table we control.
--
-- Affected modules : all
-- Rollback         : drop the triggers on auth.users and the function
-- Risk             : low. The trigger is defensive: a failure here must not
--                    prevent a user from being created, so it logs and continues.
-- =============================================================================

create or replace function core.sync_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = core, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    -- Never hard-delete the mirror: staff rows and audit rows point at it.
    update core.users set status = 'DISABLED', updated_at = now() where id = old.id;
    return old;
  end if;

  insert into core.users (id, email, full_name, phone, last_sign_in_at, status)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name',
                          new.raw_user_meta_data ->> 'name', '')), ''),
    new.phone,
    new.last_sign_in_at,
    case when new.banned_until is not null and new.banned_until > now()
         then 'DISABLED'::core.user_status
         else 'ACTIVE'::core.user_status end
  )
  on conflict (id) do update
    set email           = excluded.email,
        full_name       = coalesce(excluded.full_name, core.users.full_name),
        phone           = coalesce(excluded.phone, core.users.phone),
        last_sign_in_at = greatest(
                            coalesce(excluded.last_sign_in_at, core.users.last_sign_in_at),
                            coalesce(core.users.last_sign_in_at, excluded.last_sign_in_at)),
        status          = excluded.status,
        updated_at      = now();

  -- Claim any outstanding invitation addressed to this email.
  update core.staff s
     set user_id       = new.id,
         status        = 'ACTIVE',
         invited_email = null,
         updated_at    = now()
   where s.status = 'INVITED'
     and s.invited_email = new.email
     and s.user_id is null;

  return new;
exception
  when others then
    -- Identity creation must not fail because the mirror did.
    raise warning 'core.sync_user_from_auth failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists trg_sync_user_from_auth_ins on auth.users;
create trigger trg_sync_user_from_auth_ins
  after insert on auth.users
  for each row execute function core.sync_user_from_auth();

drop trigger if exists trg_sync_user_from_auth_upd on auth.users;
create trigger trg_sync_user_from_auth_upd
  after update on auth.users
  for each row execute function core.sync_user_from_auth();

drop trigger if exists trg_sync_user_from_auth_del on auth.users;
create trigger trg_sync_user_from_auth_del
  after delete on auth.users
  for each row execute function core.sync_user_from_auth();

-- Backfill anything that already exists.
insert into core.users (id, email, full_name, phone, last_sign_in_at)
select u.id, u.email,
       nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
       u.phone, u.last_sign_in_at
from auth.users u
on conflict (id) do nothing;
