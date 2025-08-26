-- Add is_active column to profiles (idempotent)
alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- Allow admins to insert profiles (no IF NOT EXISTS due to version)
drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
  on public.profiles
  for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));