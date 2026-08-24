-- =========================================================
-- Secure marketplace job conversations
-- Only the job owner and the accepted tradesperson may add
-- messages to the single conversation attached to a job.
-- =========================================================

alter table public.job_messages enable row level security;

-- Remove legacy INSERT policies without disturbing SELECT policies.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_messages'
      and cmd = 'INSERT'
  loop
    execute format(
      'drop policy if exists %I on public.job_messages',
      existing_policy.policyname
    );
  end loop;
end
$$;

create policy "job participants send messages"
on public.job_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and char_length(btrim(message)) between 1 and 2000
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
);
