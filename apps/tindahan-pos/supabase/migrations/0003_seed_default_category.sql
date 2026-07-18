-- 0002 backfilled an "Uncategorized" category for every store that existed
-- at the time, but the self-registration trigger never learned to do the
-- same for stores created afterward — leaving new stores with zero
-- categories and a broken (empty) Add Product category dropdown.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_store_name text;
  v_owner_name text;
begin
  v_store_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'store_name'), ''), 'My Store');
  v_owner_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'owner_name'), ''), new.email);

  insert into stores (name) values (v_store_name)
    returning id into v_store_id;

  insert into staff (id, store_id, name, email, role)
    values (new.id, v_store_id, v_owner_name, new.email, 'admin');

  insert into categories (store_id, name) values (v_store_id, 'Uncategorized');

  return new;
end;
$$;

-- Catch any store created between the 0002 backfill and this migration.
insert into categories (store_id, name)
select id, 'Uncategorized' from stores
on conflict (store_id, name) do nothing;
