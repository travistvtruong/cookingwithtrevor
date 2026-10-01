-- Photos on private library recipes (any signed-in user).
-- A PRIVATE bucket: files are only readable through short-lived signed URLs.
-- Each user owns the folder named after their user id: user-photos/<user id>/<file>.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-photos', 'user-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "users upload to own photo folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Needed to create signed URLs for viewing.
create policy "users read own photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'user-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users update own photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'user-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'user-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
