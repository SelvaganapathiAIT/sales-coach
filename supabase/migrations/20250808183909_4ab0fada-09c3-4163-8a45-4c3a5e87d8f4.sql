-- 1) Add is_active column to profiles for de/activation
alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- 2) Allow admins to insert profiles (needed to create profiles for users missing one)
create policy if not exists "Admins can insert profiles"
  on public.profiles
  for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));