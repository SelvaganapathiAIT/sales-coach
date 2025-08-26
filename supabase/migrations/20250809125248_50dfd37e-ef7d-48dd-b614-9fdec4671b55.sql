-- Storage policies to allow uploading cropped coach photos
-- Public read for profile-photos bucket
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
create policy "Public can view profile photos"
  on storage.objects
  for select
  using (bucket_id = 'profile-photos');

-- Authenticated users can upload/update/delete within coaches/{userId}/...
DROP POLICY IF EXISTS "Users can upload to their folder (profile-photos)" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their files (profile-photos)" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their files (profile-photos)" ON storage.objects;

create policy "Users can upload to their folder (profile-photos)"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'coaches'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can update their files (profile-photos)"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'coaches'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'coaches'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can delete their files (profile-photos)"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'coaches'
    and (storage.foldername(name))[2] = auth.uid()::text
  );