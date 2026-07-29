
-- KONNECTATRADIE FINAL PROFILE FIX
-- Run this once in Supabase SQL Editor.
-- Safe to run multiple times.

alter table profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
on profiles for select
using (
  id = auth.uid()
  or public.is_admin()
);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
on profiles for insert
with check (
  id = auth.uid()
);

drop policy if exists "profiles_update_own_or_admin" on profiles;
create policy "profiles_update_own_or_admin"
on profiles for update
using (
  id = auth.uid()
  or public.is_admin()
)
with check (
  id = auth.uid()
  or public.is_admin()
);

-- Create missing profile rows for existing auth users.
insert into public.profiles (id, email, role, full_name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'role', 'customer') as role,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Quick check:
-- select id, email, role, full_name from public.profiles order by created_at desc limit 20;
