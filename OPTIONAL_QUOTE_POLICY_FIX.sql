
-- OPTIONAL QUOTE INSERT POLICY FIX
-- Only run this if sending a quote gives a Supabase permission/RLS error.
-- Safe to run multiple times.

alter table job_quotes enable row level security;

drop policy if exists "job_quotes_insert_own_tradie_profile" on job_quotes;
create policy "job_quotes_insert_own_tradie_profile"
on job_quotes for insert
with check (
  exists (
    select 1
    from tradesperson_profiles tp
    where tp.id = job_quotes.tradesperson_id
    and tp.user_id = auth.uid()
  )
);

drop policy if exists "job_quotes_select_related" on job_quotes;
create policy "job_quotes_select_related"
on job_quotes for select
using (
  exists (
    select 1
    from tradesperson_profiles tp
    where tp.id = job_quotes.tradesperson_id
    and tp.user_id = auth.uid()
  )
  or exists (
    select 1
    from job_posts jp
    where jp.id = job_quotes.job_post_id
    and jp.customer_id = auth.uid()
  )
);
