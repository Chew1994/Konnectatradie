-- =========================================================
-- Secure completed marketplace-job reviews
-- Extends completed direct-booking review protection to jobs
-- completed through the quote marketplace.
-- =========================================================

alter table public.reviews
  add column if not exists job_post_id uuid
  references public.job_posts(id) on delete set null;

create unique index if not exists reviews_job_post_id_unique
on public.reviews (job_post_id)
where job_post_id is not null;

drop policy if exists "customers review completed bookings" on public.reviews;

create policy "customers review completed bookings"
on public.reviews
for insert
to authenticated
with check (
  customer_id = auth.uid()
  and (
    (
      job_request_id is not null
      and job_post_id is null
      and exists (
        select 1
        from public.job_requests jr
        where jr.id = reviews.job_request_id
          and jr.customer_id = auth.uid()
          and jr.tradesperson_id = reviews.tradesperson_id
          and coalesce(jr.lifecycle_status, jr.status) = 'completed'
      )
    )
    or
    (
      job_post_id is not null
      and job_request_id is null
      and exists (
        select 1
        from public.job_posts jp
        where jp.id = reviews.job_post_id
          and jp.customer_id = auth.uid()
          and jp.accepted_tradesperson_id = reviews.tradesperson_id
          and jp.status = 'completed'
      )
    )
  )
);
