-- 0017 backfilled a default warehouse for every store that existed at the
-- time, but never gave stores created afterward one — a new signup (via
-- either app's Register page, which just calls supabase.auth.signUp and
-- relies on 0001's handle_new_user trigger to create the store) ended up
-- with zero warehouses, breaking ActualInventory/BeginningBalance/Receiving
-- which all require one. Add a trigger so every new store gets its default
-- warehouse automatically, independent of which app created the store.

create or replace function handle_new_store()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into warehouses (store_id, name, is_default)
    values (new.id, 'Main Store', true);
  return new;
end;
$$;

create trigger on_store_created
  after insert on stores
  for each row execute function handle_new_store();
