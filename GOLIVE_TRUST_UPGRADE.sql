
-- KONNECTATRADIE GO-LIVE TRUST + VERIFICATION UPGRADE
-- Run this in Supabase SQL Editor before deploying this package.

create extension if not exists pgcrypto;

-- Verification documents uploaded by tradespeople
create table if not exists tradesperson_documents (
  id uuid primary key default gen_random_uuid(),
  tradesperson_id uuid references tradesperson_profiles(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  document_type text not null,
  document_name text,
  file_url text not null,
  verification_status text default 'pending',
  admin_note text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

alter table tradesperson_profiles
add column if not exists verification_status text default 'pending',
add column if not exists verified_at timestamptz,
add column if not exists public_liability_insurance boolean default false,
add column if not exists licence_number text,
add column if not exists insurance_expiry date;

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do update set public = false;

alter table tradesperson_documents enable row level security;
alter table portfolio_photos enable row level security;

-- Portfolio policies
drop policy if exists "Anyone can read portfolio" on portfolio_photos;
create policy "Anyone can read portfolio"
on portfolio_photos for select
using (true);

drop policy if exists "Tradie can insert portfolio" on portfolio_photos;
create policy "Tradie can insert portfolio"
on portfolio_photos for insert
with check (
  exists (
    select 1 from tradesperson_profiles tp
    where tp.id = tradesperson_id
    and tp.user_id = auth.uid()
  )
);

drop policy if exists "Tradie can delete own portfolio" on portfolio_photos;
create policy "Tradie can delete own portfolio"
on portfolio_photos for delete
using (
  exists (
    select 1 from tradesperson_profiles tp
    where tp.id = tradesperson_id
    and tp.user_id = auth.uid()
  )
  or public.is_admin()
);

-- Verification document policies
drop policy if exists "Tradie can upload verification docs" on tradesperson_documents;
create policy "Tradie can upload verification docs"
on tradesperson_documents for insert
with check (user_id = auth.uid());

drop policy if exists "Tradie can view own verification docs" on tradesperson_documents;
create policy "Tradie can view own verification docs"
on tradesperson_documents for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admin can update verification docs" on tradesperson_documents;
create policy "Admin can update verification docs"
on tradesperson_documents for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Tradie can delete own pending docs" on tradesperson_documents;
create policy "Tradie can delete own pending docs"
on tradesperson_documents for delete
using ((user_id = auth.uid() and verification_status = 'pending') or public.is_admin());

-- Storage object policies
drop policy if exists "portfolio public read" on storage.objects;
create policy "portfolio public read"
on storage.objects for select
using (bucket_id = 'portfolio');

drop policy if exists "authenticated upload portfolio" on storage.objects;
create policy "authenticated upload portfolio"
on storage.objects for insert
with check (bucket_id = 'portfolio' and auth.uid() is not null);

drop policy if exists "authenticated delete portfolio" on storage.objects;
create policy "authenticated delete portfolio"
on storage.objects for delete
using (bucket_id = 'portfolio' and auth.uid() is not null);

drop policy if exists "verification docs owner upload" on storage.objects;
create policy "verification docs owner upload"
on storage.objects for insert
with check (bucket_id = 'verification-documents' and auth.uid() is not null);

drop policy if exists "verification docs owner admin read" on storage.objects;
create policy "verification docs owner admin read"
on storage.objects for select
using (bucket_id = 'verification-documents' and (auth.uid() is not null or public.is_admin()));

drop policy if exists "verification docs owner admin delete" on storage.objects;
create policy "verification docs owner admin delete"
on storage.objects for delete
using (bucket_id = 'verification-documents' and (auth.uid() is not null or public.is_admin()));

-- Helpful launch check queries:
-- select count(*) from profiles;
-- select count(*) from tradesperson_profiles;
-- select count(*) from tradesperson_documents;
-- select count(*) from portfolio_photos;
