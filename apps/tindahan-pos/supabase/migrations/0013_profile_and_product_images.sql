-- Profile pictures (staff.avatar_url) and product pictures (products.image_url)
--
-- Storage model:
--   * Two public Storage buckets — "avatars" and "product-images". They're
--     public (served straight from the CDN URL) because staff photos and
--     product photos aren't sensitive, and it avoids signed-URL plumbing.
--     Writes are still locked down: only a store's own staff can touch its
--     own objects, enforced below via storage.objects RLS policies keyed off
--     the same auth_store_id()/auth_role() helpers the rest of the schema
--     uses.
--   * Object paths are always constructed by the app as
--     "<store_id>/<staff_id>/avatar.<ext>" or
--     "<store_id>/<product_id>/image.<ext>" — never taken from a
--     user-supplied filename — so there's no path-traversal surface.
--   * Bucket-level file_size_limit + allowed_mime_types reject anything
--     that isn't a small image at the Storage API level, before any RLS
--     policy even runs. The app additionally re-encodes every upload
--     through a canvas client-side (see src/lib/imageUpload.ts) — that
--     strips any non-pixel payload a spoofed/polyglot file might carry,
--     which is a stronger guarantee than trusting the file's extension or
--     claimed MIME type.

alter table staff add column avatar_url text;
alter table staff add column phone text;

alter table products add column image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png']),
  ('product-images', 'product-images', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "public can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "staff can upload own avatar, admin can upload any in store"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or auth_role() = 'admin'
    )
  );

create policy "staff can replace own avatar, admin can replace any in store"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or auth_role() = 'admin'
    )
  );

create policy "staff can delete own avatar, admin can delete any in store"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or auth_role() = 'admin'
    )
  );

create policy "public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "admin can upload product images in own store"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and auth_role() = 'admin'
  );

create policy "admin can replace product images in own store"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and auth_role() = 'admin'
  );

create policy "admin can delete product images in own store"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and auth_role() = 'admin'
  );
