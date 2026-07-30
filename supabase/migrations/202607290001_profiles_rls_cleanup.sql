begin;

-- Consolidate duplicate Row Level Security policies on public.profiles.
-- This migration preserves the current access behaviour:
--   1. Users can insert their own profile.
--   2. Users can read their own profile; admins can read all profiles.
--   3. Users can update their own profile; admins can update all profiles.

drop policy if exists "Users can insert their own profile"
on public.profiles;

drop policy if exists "profiles insert own"
on public.profiles;

drop policy if exists "profiles_insert_own"
on public.profiles;

drop policy if exists "profiles select own or admin"
on public.profiles;

drop policy if exists "profiles_select_own_or_admin"
on public.profiles;

drop policy if exists "Users can update their own profile"
on public.profiles;

drop policy if exists "admin manage profiles"
on public.profiles;

drop policy if exists "profiles update own or admin"
on public.profiles;

drop policy if exists "profiles_update_own_or_admin"
on public.profiles;

create policy "profiles_insert_own"
on public.profiles
for insert
to public
with check (
  id = auth.uid()
);

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to public
using (
  id = auth.uid()
  or public.is_admin()
);

create policy "profiles_update_own_or_admin"
on public.profiles
for update
to public
using (
  id = auth.uid()
  or public.is_admin()
)
with check (
  id = auth.uid()
  or public.is_admin()
);
commit;