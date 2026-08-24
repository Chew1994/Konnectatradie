-- =========================================================
-- Secure completed-job reviews
-- Reviews must belong to a completed direct booking owned
-- by the authenticated customer.
-- =========================================================

-- Remove legacy permissive policies that allow a customer
-- to review any tradesperson simply by matching customer_id.
drop policy if exists "Customers can add reviews" on public.reviews;
drop policy if exists "customers insert reviews" on public.reviews;
drop policy if exists "protected confirmed reviews insert" on public.reviews;
drop policy if exists "customers review completed bookings" on public.reviews;

-- One review per completed direct booking.
create unique index if not exists reviews_job_request_id_unique
on public.reviews (job_request_id)
where job_request_id is not null;

-- New protected insert policy.
create policy "customers review completed bookings"
on public.reviews
for insert
to authenticated
with check (
  customer_id = auth.uid()
  and job_request_id is not null
  and exists (
    select 1
    from public.job_requests jr
    where jr.id = reviews.job_request_id
      and jr.customer_id = auth.uid()
      and jr.tradesperson_id = reviews.tradesperson_id
      and coalesce(jr.lifecycle_status, jr.status) = 'completed'
  )
);
