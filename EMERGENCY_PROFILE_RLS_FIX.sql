
-- EMERGENCY PROFILE RLS FIX
-- Run this in Supabase SQL Editor if new users get "Profile could not load"
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

-- Optional: check whether a user profile exists after signup
-- select id, email, role, full_name, created_at from profiles order by created_at desc limit 20;
