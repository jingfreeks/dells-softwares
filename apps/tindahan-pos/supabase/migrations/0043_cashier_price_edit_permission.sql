-- Staff page phase 3: real "Edit Role" — cashier price-edit permission.
--
-- Access control everywhere else in this app is strictly binary
-- (auth_role() = 'admin'), enforced across ~45 RLS policies/RPCs. A full
-- per-cashier granular permission system would mean rewriting most of
-- those checkpoints -- a large change to the app's core security model,
-- deliberately out of scope. This adds exactly one real, admin-editable
-- permission: whether cashiers may edit a product's price.
--
-- The "Change prices" row on the Staff page's permission card has been
-- misleading until now -- it showed "allowed" whenever a cashier could
-- navigate to /inventory, but the products UPDATE policy was
-- unconditionally admin-only, so a cashier's price edit was silently
-- rejected by RLS. This migration makes that real: a new store flag
-- gates it, and a trigger enforces that a permitted cashier can only
-- ever change the price-related columns, never anything else, in the
-- same UPDATE statement.

alter table stores
  add column cashier_can_edit_prices boolean not null default false;

-- ---------------------------------------------------------------------------
-- guard_cashier_product_update: column-level enforcement RLS alone can't
-- express. An admin's update is untouched. A cashier's update is allowed
-- only when the store permits it, and only if the columns that actually
-- changed are limited to price / pack_quantity / pack_price (kept
-- together -- they're a paired unit per products_pack_pairing_check).
-- ---------------------------------------------------------------------------

create function guard_cashier_product_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_can_edit boolean;
begin
  if auth_role() = 'admin' then
    return new;
  end if;

  select cashier_can_edit_prices into v_can_edit from stores where id = new.store_id;
  if not coalesce(v_can_edit, false) then
    raise exception 'PRICE_EDIT_NOT_ALLOWED';
  end if;

  if new.barcode is distinct from old.barcode
    or new.name is distinct from old.name
    or new.stock is distinct from old.stock
    or new.low_stock_threshold is distinct from old.low_stock_threshold
    or new.category is distinct from old.category
    or new.category_id is distinct from old.category_id
    or new.image_url is distinct from old.image_url
    or new.cost is distinct from old.cost
  then
    raise exception 'ONLY_PRICE_FIELDS_EDITABLE';
  end if;

  return new;
end;
$$;

create trigger guard_cashier_product_update
  before update on products
  for each row execute function guard_cashier_product_update();

-- RLS still needs to let a cashier's UPDATE statement reach the trigger at
-- all -- the existing "admin can update products" policy alone blocks it
-- outright. This is deliberately permissive at the RLS layer; the trigger
-- above does the real, precise enforcement.
create policy "cashier can attempt product price update"
  on products for update
  using (store_id = auth_store_id() and auth_role() = 'cashier');
