-- Create app_settings table for global app configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Public can read settings (for homepage)
drop policy if exists "Public can read app settings" on public.app_settings;
create policy "Public can read app settings"
  on public.app_settings
  for select
  to anon, authenticated
  using (true);

-- Only admins can insert/update settings
drop policy if exists "Admins can upsert app settings" on public.app_settings;
drop policy if exists "Admins can update app settings" on public.app_settings;

create policy  "Admins can upsert app settings"
  on public.app_settings
  for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy  "Admins can update app settings"
  on public.app_settings
  for update
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));