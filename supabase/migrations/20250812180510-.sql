-- Create private bucket for coach training files
insert into storage.buckets (id, name, public)
values ('coach-training', 'coach-training', false)
on conflict (id) do nothing;

-- RLS policies for storage.objects on coach-training bucket
-- Users can view files in their own folder (/{user_id}/...)
drop policy if exists "Users can view their own training files" on storage.objects;
create policy "Users can view their own training files"
on storage.objects
for select
using (
  bucket_id = 'coach-training' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload files to their own folder
drop policy if exists "Users can upload their own training files" on storage.objects;

create policy "Users can upload their own training files"
on storage.objects
for insert
with check (
  bucket_id = 'coach-training' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update files in their own folder
drop policy if exists "Users can update their own training files" on storage.objects;
create policy "Users can update their own training files"
on storage.objects
for update
using (
  bucket_id = 'coach-training' AND auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'coach-training' AND auth.uid()::text = (storage.foldername(name))[1]
);




-- Users can delete files in their own folder
drop policy if exists "Users can delete their own training files" on storage.objects;

-- Users can delete files in their own folder
drop policy if exists "Users can delete their own training files" on storage.objects;
create policy "Users can delete their own training files"
on storage.objects
for delete
using (
  bucket_id = 'coach-training' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins and CEOs can manage all training files
drop policy if exists "Admins and CEOs can manage training files" on storage.objects;
create policy "Admins and CEOs can manage training files"
on storage.objects
for all
using (
  bucket_id = 'coach-training' 
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ceo'::public.app_role)
  )
)
with check (
  bucket_id = 'coach-training' 
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ceo'::public.app_role)
  )
);


create policy "Users can delete their own training files"
on storage.objects
for delete
using (
  bucket_id = 'coach-training' AND auth.uid()::text = (storage.foldername(name))[1]
);
