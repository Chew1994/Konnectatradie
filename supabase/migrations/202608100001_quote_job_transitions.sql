-- =========================================================
-- KonnectATradie
-- Atomic quote/job-post lifecycle transitions
-- =========================================================
-- =========================================================
-- Quote acceptance state stored on the job post
-- =========================================================

alter table public.job_posts
  add column if not exists accepted_quote_id uuid
    references public.job_quotes(id)
    on delete set null;

alter table public.job_posts
  add column if not exists accepted_tradesperson_id uuid
    references public.tradesperson_profiles(id)
    on delete set null;

create index if not exists job_posts_accepted_quote_id_idx
  on public.job_posts(accepted_quote_id);

create index if not exists job_posts_accepted_tradesperson_id_idx
  on public.job_posts(accepted_tradesperson_id);
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
  v_quote public.job_quotes%rowtype;
  v_job public.job_posts%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_quote
  from public.job_quotes
  where id = p_quote_id
  for update;

  if not found then
    raise exception 'Quote not found';
  end if;

  select *
  into v_job
  from public.job_posts
  where id = v_quote.job_post_id
  for update;

  if not found then
    raise exception 'Job not found';
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
  set status = 'accepted'
  where id = v_quote.id;

  update public.job_posts
  set
    status = 'quote_accepted',
    accepted_quote_id = v_quote.id,
    accepted_tradesperson_id = v_quote.tradesperson_id
  where id = v_job.id;
end;
$$;


create or replace function public.cancel_accepted_job_quote(
  p_quote_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_quote public.job_quotes%rowtype;
  v_job public.job_posts%rowtype;
  v_tradie_owns_quote boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_quote
  from public.job_quotes
  where id = p_quote_id
  for update;

  if not found then
    raise exception 'Quote not found';
  end if;

  select *
  into v_job
  from public.job_posts
  where id = v_quote.job_post_id
  for update;

  if not found then
    raise exception 'Job not found';
  end if;

  select exists (
    select 1
    from public.tradesperson_profiles tp
    where tp.id = v_quote.tradesperson_id
      and tp.user_id = v_user_id
  )
  into v_tradie_owns_quote;

if v_job.customer_id is distinct from v_user_id
   and not v_tradie_owns_quote
   and not public.is_admin() then
  raise exception 'You may not cancel this accepted job';
end if;

if v_quote.status <> 'accepted' then
  raise exception 'Only accepted quotes may be cancelled';
end if;

  if v_job.accepted_quote_id is distinct from v_quote.id then
    raise exception 'Quote is not the accepted quote for this job';
  end if;

  update public.job_quotes
  set status = 'cancelled'
  where id = v_quote.id;

  update public.job_posts
  set
    status = 'open',
    accepted_quote_id = null,
    accepted_tradesperson_id = null
  where id = v_job.id;
end;
$$;


create or replace function public.complete_accepted_job_quote(
  p_quote_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_quote public.job_quotes%rowtype;
  v_job public.job_posts%rowtype;
  v_tradie_owns_quote boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_quote
  from public.job_quotes
  where id = p_quote_id
  for update;

  if not found then
    raise exception 'Quote not found';
  end if;

  select *
  into v_job
  from public.job_posts
  where id = v_quote.job_post_id
  for update;

  if not found then
    raise exception 'Job not found';
  end if;

  select exists (
    select 1
    from public.tradesperson_profiles tp
    where tp.id = v_quote.tradesperson_id
      and tp.user_id = v_user_id
  )
  into v_tradie_owns_quote;

  if not v_tradie_owns_quote and not public.is_admin() then
    raise exception 'Only the assigned tradesperson may complete this job';
  end if;

  if v_quote.status <> 'accepted' then
    raise exception 'Only accepted jobs may be completed';
  end if;

  if v_job.accepted_quote_id is distinct from v_quote.id then
    raise exception 'Quote is not the accepted quote for this job';
  end if;

  update public.job_quotes
  set status = 'completed'
  where id = v_quote.id;

  update public.job_posts
  set status = 'completed'
  where id = v_job.id;
end;
$$;


revoke all on function public.accept_job_quote(uuid) from public;
revoke all on function public.cancel_accepted_job_quote(uuid) from public;
revoke all on function public.complete_accepted_job_quote(uuid) from public;

grant execute on function public.accept_job_quote(uuid) to authenticated;
grant execute on function public.cancel_accepted_job_quote(uuid) to authenticated;
grant execute on function public.complete_accepted_job_quote(uuid) to authenticated;