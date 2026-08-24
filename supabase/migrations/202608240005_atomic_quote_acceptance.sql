-- =========================================================
-- KonnectATradie
-- Harden marketplace quote acceptance as one transaction
-- =========================================================

create or replace function public.accept_job_quote(
  p_quote_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_job_id uuid;
  v_quote public.job_quotes%rowtype;
  v_job public.job_posts%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Resolve the job first, then lock the shared job row before any quote row.
  -- This consistent lock order serialises simultaneous acceptance attempts.
  select job_post_id
  into v_job_id
  from public.job_quotes
  where id = p_quote_id;

  if not found then
    raise exception 'Quote not found';
  end if;

  select *
  into v_job
  from public.job_posts
  where id = v_job_id
  for update;

  if not found then
    raise exception 'Job not found';
  end if;

  select *
  into v_quote
  from public.job_quotes
  where id = p_quote_id
    and job_post_id = v_job.id
  for update;

  if not found then
    raise exception 'Quote not found';
  end if;

  if v_job.customer_id is distinct from v_user_id then
    raise exception 'Only the job owner may accept a quote';
  end if;

  if coalesce(v_quote.status, 'pending') <> 'pending' then
    raise exception 'Only pending quotes may be accepted';
  end if;

  if v_job.status <> 'open' then
    raise exception 'This job is no longer open';
  end if;

  if v_job.accepted_quote_id is not null then
    raise exception 'This job already has an accepted quote';
  end if;

  update public.job_quotes
  set status = case
    when id = v_quote.id then 'accepted'
    else 'declined'
  end
  where job_post_id = v_job.id
    and coalesce(status, 'pending') = 'pending';

  update public.job_posts
  set
    status = 'quote_accepted',
    accepted_quote_id = v_quote.id,
    accepted_tradesperson_id = v_quote.tradesperson_id
  where id = v_job.id;
end;
$$;

revoke all on function public.accept_job_quote(uuid) from public;
revoke all on function public.accept_job_quote(uuid) from anon;
