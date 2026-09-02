-- Private marketplace conversations are scoped to one quote.
-- Direct-booking conversations continue to use job_request_id only.

alter table public.job_messages
  add column if not exists quote_id uuid;

update public.job_messages jm
set quote_id = jp.accepted_quote_id
from public.job_posts jp
where jm.job_post_id = jp.id
  and jm.job_request_id is null
  and jm.quote_id is null
  and jp.accepted_quote_id is not null;

-- A legacy job conversation with exactly one quote can be assigned safely.
update public.job_messages jm
set quote_id = candidate.quote_id
from (
  select jq.job_post_id, min(jq.id::text)::uuid as quote_id
  from public.job_quotes jq
  group by jq.job_post_id
  having count(*) = 1
) candidate
where jm.job_post_id = candidate.job_post_id
  and jm.job_request_id is null
  and jm.quote_id is null;

do $$
begin
  if exists (
    select 1
    from public.job_messages
    where job_post_id is not null
      and quote_id is null
  ) then
    raise exception 'Cannot safely assign every legacy marketplace message to a quote';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.job_messages'::regclass
      and conname = 'job_messages_quote_id_fkey'
  ) then
    alter table public.job_messages
      add constraint job_messages_quote_id_fkey
      foreign key (quote_id) references public.job_quotes(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.job_messages'::regclass
      and conname = 'job_messages_quote_scope'
  ) then
    alter table public.job_messages
      add constraint job_messages_quote_scope check (
        (job_post_id is not null and job_request_id is null and quote_id is not null)
        or
        (job_post_id is null and job_request_id is not null and quote_id is null)
      );
  end if;
end
$$;

create index if not exists job_messages_quote_id_idx
  on public.job_messages(quote_id);

drop policy if exists "Participants can read messages" on public.job_messages;
drop policy if exists "job participants send messages" on public.job_messages;

create policy "Participants can read messages"
on public.job_messages
for select
to authenticated
using (
  (
    job_post_id is not null
    and job_request_id is null
    and quote_id is not null
    and exists (
      select 1
      from public.job_quotes jq
      join public.job_posts jp on jp.id = jq.job_post_id
      join public.tradesperson_profiles tp on tp.id = jq.tradesperson_id
      where jq.id = job_messages.quote_id
        and jq.job_post_id = job_messages.job_post_id
        and (jp.customer_id = auth.uid() or tp.user_id = auth.uid())
    )
  )
  or
  (
    job_request_id is not null
    and job_post_id is null
    and quote_id is null
    and exists (
      select 1
      from public.job_requests jr
      join public.tradesperson_profiles tp on tp.id = jr.tradesperson_id
      where jr.id = job_messages.job_request_id
        and coalesce(jr.lifecycle_status, jr.status) in (
          'accepted', 'in_progress', 'completed', 'reviewed'
        )
        and (jr.customer_id = auth.uid() or tp.user_id = auth.uid())
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
      and quote_id is not null
      and exists (
        select 1
        from public.job_quotes jq
        join public.job_posts jp on jp.id = jq.job_post_id
        join public.tradesperson_profiles tp on tp.id = jq.tradesperson_id
        where jq.id = job_messages.quote_id
          and jq.job_post_id = job_messages.job_post_id
          and jq.status in ('pending', 'accepted', 'completed')
          and (jp.customer_id = auth.uid() or tp.user_id = auth.uid())
      )
    )
    or
    (
      job_request_id is not null
      and job_post_id is null
      and quote_id is null
      and exists (
        select 1
        from public.job_requests jr
        join public.tradesperson_profiles tp on tp.id = jr.tradesperson_id
        where jr.id = job_messages.job_request_id
          and coalesce(jr.lifecycle_status, jr.status) in (
            'accepted', 'in_progress', 'completed', 'reviewed'
          )
          and (jr.customer_id = auth.uid() or tp.user_id = auth.uid())
      )
    )
  )
);
