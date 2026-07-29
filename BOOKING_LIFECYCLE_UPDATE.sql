
-- KONNECTATRADIE PREMIUM BOOKING LIFECYCLE UPDATE
-- Safe to run multiple times.

alter table job_requests
add column if not exists lifecycle_status text default 'requested',
add column if not exists requested_at timestamptz default now(),
add column if not exists started_at timestamptz,
add column if not exists completed_at timestamptz,
add column if not exists reviewed_at timestamptz,
add column if not exists customer_email text,
add column if not exists customer_name text,
add column if not exists customer_phone text;

-- Backfill lifecycle status from old status values
update job_requests
set lifecycle_status =
  case
    when status in ('accepted','paid') then 'accepted'
    when status = 'declined' then 'declined'
    when status = 'in_progress' then 'in_progress'
    when status = 'completed' then 'completed'
    when status = 'reviewed' then 'reviewed'
    else 'requested'
  end
where lifecycle_status is null;

-- Keep older status column usable too
update job_requests
set status = lifecycle_status
where status is null or status in ('pending_response','pending_payment','not_paid','not_charged');

alter table job_requests enable row level security;

drop policy if exists "job participants can read" on job_requests;
create policy "job participants can read" on job_requests for select using (
  customer_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from tradesperson_profiles tp
    where tp.id = tradesperson_id
    and tp.user_id = auth.uid()
  )
);

drop policy if exists "job participants can update" on job_requests;
create policy "job participants can update" on job_requests for update using (
  public.is_admin()
  or customer_id = auth.uid()
  or exists (
    select 1 from tradesperson_profiles tp
    where tp.id = tradesperson_id
    and tp.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or customer_id = auth.uid()
  or exists (
    select 1 from tradesperson_profiles tp
    where tp.id = tradesperson_id
    and tp.user_id = auth.uid()
  )
);
