-- Create coaches table first
CREATE TABLE IF NOT EXISTS public.coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  description text,
  avatar_url text,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coaches enable row level security;

-- Create coach_users linking table BEFORE policies that reference it
CREATE TABLE IF NOT EXISTS public.coach_users (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coach_id, user_id)
);

alter table public.coach_users enable row level security;
-- Indexes
create index if not exists idx_coaches_owner on public.coaches(owner_user_id);

-- RLS policies for coaches
drop policy if exists "Owners can manage their coaches" on public.coaches;
drop policy if exists "Assigned users can view coaches" on public.coaches;
create policy "Owners can manage their coaches"
  on public.coaches
  for all
  using (owner_user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (owner_user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "Assigned users can view coaches"
  on public.coaches
  for select
  using (
    owner_user_id = auth.uid() or public.has_role(auth.uid(), 'admin') or exists (
      select 1 from public.coach_users cu
      where cu.coach_id = coaches.id and cu.user_id = auth.uid()
    )
  );

-- Trigger to auto-update updated_at
-- Ensure no duplicate trigger name
drop trigger if exists update_coaches_updated_at on public.coaches;
create trigger update_coaches_updated_at
  before update on public.coaches
  for each row execute function public.update_updated_at_column();

-- Create coach_users linking table
CREATE TABLE IF NOT EXISTS public.coach_users (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coach_id, user_id)
);

alter table public.coach_users enable row level security;

-- Indexes for coach_users
create index if not exists idx_coach_users_user on public.coach_users(user_id);
create index if not exists idx_coach_users_coach on public.coach_users(coach_id);

-- RLS: owners can manage assignments, users can view their own
drop policy if exists "Owners can manage coach assignments" on public.coach_users;
drop policy if exists "Users can view their own coach assignments" on public.coach_users;
create policy "Owners can manage coach assignments"
  on public.coach_users
  for all
  using (
    exists (
      select 1 from public.coaches c
      where c.id = coach_users.coach_id
        and (c.owner_user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.coaches c
      where c.id = coach_users.coach_id
        and (c.owner_user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

create policy "Users can view their own coach assignments"
  on public.coach_users
  for select
  using (user_id = auth.uid() or exists (
    select 1 from public.coaches c
    where c.id = coach_users.coach_id
      and (c.owner_user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  ));

-- Add default coach to profiles
alter table public.profiles
  add column if not exists default_coach_id uuid references public.coaches(id) on delete set null;

-- Optional helpful view permissions: admins can view all
drop policy if exists "Admins can view all coaches" on public.coaches;
drop policy if exists "Admins can view all coach assignments" on public.coach_users;
create policy "Admins can view all coaches"
  on public.coaches
  for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can view all coach assignments"
  on public.coach_users
  for select
  using (public.has_role(auth.uid(), 'admin'));
