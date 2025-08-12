-- Create app_settings table for global app configuration
create table if not exists public.app_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Public can read settings (for homepage)
create policy if not exists "Public can read app settings"
  on public.app_settings
  for select
  to anon, authenticated
  using (true);

-- Only admins can insert/update settings
create policy if not exists "Admins can upsert app settings"
  on public.app_settings
  for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy if not exists "Admins can update app settings"
  on public.app_settings
  for update
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));