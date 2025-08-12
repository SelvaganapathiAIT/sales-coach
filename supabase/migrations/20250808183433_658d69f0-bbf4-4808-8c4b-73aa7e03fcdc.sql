-- 1) Backfill missing profiles from auth.users
insert into public.profiles (user_id, email, first_name, last_name)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'first_name', null) as first_name,
       coalesce(u.raw_user_meta_data->>'last_name', null)  as last_name
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null;

-- 2) Update any existing profiles missing email from auth.users before enforcing uniqueness
update public.profiles p
set email = u.email
from auth.users u
where p.user_id = u.id
  and (p.email is null or p.email = '');

-- 3) Deduplicate profiles with the same email (case-insensitive): keep the lowest id
with email_dupes as (
  select lower(email) as email_lower, min(id) as keep_id
  from public.profiles
  where email is not null
  group by lower(email)
  having count(*) > 1
), to_delete as (
  select p.id
  from public.profiles p
  join email_dupes d on lower(p.email) = d.email_lower
  where p.id <> d.keep_id
)
delete from public.profiles where id in (select id from to_delete);

-- 4) Deduplicate profiles for the same user_id: keep the lowest id
with user_dupes as (
  select user_id, min(id) as keep_id
  from public.profiles
  where user_id is not null
  group by user_id
  having count(*) > 1
), to_delete2 as (
  select p.id
  from public.profiles p
  join user_dupes d on p.user_id = d.user_id
  where p.id <> d.keep_id
)
delete from public.profiles where id in (select id from to_delete2);

-- 5) Enforce one profile per user (ignore nulls)
create unique index if not exists profiles_user_id_unique
  on public.profiles (user_id)
  where user_id is not null;

-- 6) Enforce unique emails case-insensitively (ignore nulls)
create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;

-- 7) Create trigger to auto-create a profile when a new auth user is inserted
--    First drop existing trigger if present to avoid duplicates
drop trigger if exists on_auth_user_created_handle_profile on auth.users;
create trigger on_auth_user_created_handle_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();