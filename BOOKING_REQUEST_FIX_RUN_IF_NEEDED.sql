
-- BOOKING REQUEST FIX
-- Run this in Supabase SQL Editor if booking requests still fail.
-- It makes sure launch/no-fee booking statuses are accepted.

alter table job_requests drop constraint if exists job_requests_deposit_status_check;

alter table job_requests
add constraint job_requests_deposit_status_check
check (
  deposit_status in (
    'not_paid',
    'paid',
    'refunded',
    'waived',
    'not_required',
    'no_fee'
  )
);

-- Optional check:
-- select status, deposit_status, count(*) from job_requests group by status, deposit_status order by count(*) desc;
