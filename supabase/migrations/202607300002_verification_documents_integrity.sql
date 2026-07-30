-- Verification-document rows must belong to the signed-in tradesperson.
-- New documents must always begin in a pending, unreviewed state.

drop policy if exists "Tradie can upload verification docs"
on public.tradesperson_documents;

create policy "Tradie can upload verification docs"
on public.tradesperson_documents
for insert
to authenticated
with check (
  user_id = auth.uid()
  and verification_status = 'pending'
  and admin_note is null
  and reviewed_at is null
  and file_url like tradesperson_id::text || '/%'
and file_url not like '%://%'
  and exists (
    select 1
    from public.tradesperson_profiles tp
    where tp.id = tradesperson_id
      and tp.user_id = auth.uid()
  )
);