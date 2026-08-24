-- =========================================================
-- Secure conversations for marketplace and direct bookings
-- A message belongs to exactly one job workflow and is visible
-- only to that job's customer and accepted/booked tradesperson.
-- =========================================================

alter table public.job_messages enable row level security;

create index if not exists job_messages_job_request_id_idx
  on public.job_messages(job_request_id);

do $$
begin
  if exists (
    select 1
    from public.job_messages
    where (job_post_id is null) = (job_request_id is null)
  ) then
    raise exception 'Existing job_messages must reference exactly one job target';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.job_messages'::regclass
      and conname = 'job_messages_one_job_target'
  ) then
    alter table public.job_messages
      add constraint job_messages_one_job_target
      check ((job_post_id is null) <> (job_request_id is null));
  end if;
end
$$;

drop policy if exists "Participants can read messages"
  on public.job_messages;

drop policy if exists "job participants send messages"
  on public.job_messages;

create policy "Participants can read messages"
on public.job_messages
for select
to authenticated
using (
  (
    job_post_id is not null
    and job_request_id is null
    and exists (
      select 1
      from public.job_posts jp
      where jp.id = job_messages.job_post_id
        and jp.accepted_tradesperson_id is not null
        and (
          jp.customer_id = auth.uid()
          or exists (
            select 1
            from public.tradesperson_profiles tp
            where tp.id = jp.accepted_tradesperson_id
              and tp.user_id = auth.uid()
          )
        )
    )
  )
  or
  (
    job_request_id is not null
    and job_post_id is null
    and exists (
      select 1
      from public.job_requests jr
      join public.tradesperson_profiles tp
        on tp.id = jr.tradesperson_id
      where jr.id = job_messages.job_request_id
        and coalesce(jr.lifecycle_status, jr.status) in (
          'accepted', 'in_progress', 'completed', 'reviewed'
        )
        and (
          jr.customer_id = auth.uid()
          or tp.user_id = auth.uid()
        )
    )
  )
);

create policy "job participants send messages"
on public.job_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and char_length(btrim(message)) between 1 and 2000
  and (
    (
      job_post_id is not null
      and job_request_id is null
      and exists (
        select 1
        from public.job_posts jp
        where jp.id = job_messages.job_post_id
          and jp.accepted_tradesperson_id is not null
          and (
            jp.customer_id = auth.uid()
            or exists (
              select 1
              from public.tradesperson_profiles tp
              where tp.id = jp.accepted_tradesperson_id
                and tp.user_id = auth.uid()
            )
          )
      )
    )
    or
    (
      job_request_id is not null
      and job_post_id is null
      and exists (
        select 1
        from public.job_requests jr
        join public.tradesperson_profiles tp
          on tp.id = jr.tradesperson_id
        where jr.id = job_messages.job_request_id
          and coalesce(jr.lifecycle_status, jr.status) in (
            'accepted', 'in_progress', 'completed', 'reviewed'
          )
          and (
            jr.customer_id = auth.uid()
            or tp.user_id = auth.uid()
          )
      )
    )
  )
);
