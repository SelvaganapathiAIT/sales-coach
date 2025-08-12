-- Bootstrap admin role for the specified email
-- 1) Insert admin role into user_roles
insert into public.user_roles (user_id, role)
select u.id, 'admin'::app_role
from auth.users u
where lower(u.email) = lower('robert@callproof.com')
on conflict (user_id, role) do nothing;

-- 2) Reflect role in profiles table for convenience
update public.profiles p
set role = 'admin'
from auth.users u
where p.user_id = u.id
  and lower(u.email) = lower('robert@callproof.com');