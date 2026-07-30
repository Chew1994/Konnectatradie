-- Restrict verification-document files to their owning tradesperson.
-- Storage paths use: <tradesperson_profile_id>/<filename>

drop policy if exists "verification docs owner upload"
on storage.objects;

create policy "verification docs owner upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'verification-documents'
  and exists (
    select 1
    from public.tradesperson_profiles tp
    where tp.id::text = (storage.foldername(name))[1]
      and tp.user_id = auth.uid()
  )
);

drop policy if exists "verification docs owner admin read"
on storage.objects;

create policy "verification docs owner admin read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'verification-documents'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.tradesperson_profiles tp
      where tp.id::text = (storage.foldername(name))[1]
        and tp.user_id = auth.uid()
    )
  )
);

drop policy if exists "verification docs owner admin delete"
on storage.objects;

create policy "verification docs owner admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'verification-documents'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.tradesperson_profiles tp
      where tp.id::text = (storage.foldername(name))[1]
        and tp.user_id = auth.uid()
    )
  )
);
-- Restrict portfolio uploads and deletes to the owning tradesperson.
-- Storage paths use: <tradesperson_profile_id>/<filename>

drop policy if exists "authenticated upload portfolio"
on storage.objects;

create policy "authenticated upload portfolio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'portfolio'
  and exists (
    select 1
    from public.tradesperson_profiles tp
    where tp.id::text = (storage.foldername(name))[1]
      and tp.user_id = auth.uid()
  )
);

drop policy if exists "authenticated delete portfolio"
on storage.objects;

create policy "authenticated delete portfolio"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'portfolio'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.tradesperson_profiles tp
      where tp.id::text = (storage.foldername(name))[1]
        and tp.user_id = auth.uid()
    )
  )
);