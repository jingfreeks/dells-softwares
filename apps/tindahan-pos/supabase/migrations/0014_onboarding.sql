-- Post-registration onboarding: profile address, store address/photo, and a
-- per-admin "have they finished the wizard" flag.
--
-- Every change here is purely additive (new nullable columns, a new bucket,
-- new policies) — nothing existing is altered, renamed, or dropped, so this
-- migration is safe to apply independently of app code and trivially
-- revertible if something goes wrong. Rollback, if ever needed:
--
--   drop policy "public can view store photos" on storage.objects;
--   drop policy "admin can upload store photo in own store" on storage.objects;
--   drop policy "admin can replace store photo in own store" on storage.objects;
--   drop policy "admin can delete store photo in own store" on storage.objects;
--   delete from storage.objects where bucket_id = 'store-photos';
--   delete from storage.buckets where id = 'store-photos';
--   alter table staff drop column address;
--   alter table staff drop column onboarded_at;
--   alter table stores drop column address;
--   alter table stores drop column photo_url;

alter table staff add column address text;
alter table staff add column onboarded_at timestamptz;

alter table stores add column address text;
alter table stores add column photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-photos', 'store-photos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "public can view store photos"
  on storage.objects for select
  using (bucket_id = 'store-photos');

create policy "admin can upload store photo in own store"
  on storage.objects for insert
  with check (
    bucket_id = 'store-photos'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and auth_role() = 'admin'
  );

create policy "admin can replace store photo in own store"
  on storage.objects for update
  using (
    bucket_id = 'store-photos'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and auth_role() = 'admin'
  );

create policy "admin can delete store photo in own store"
  on storage.objects for delete
  using (
    bucket_id = 'store-photos'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and auth_role() = 'admin'
  );
