-- =========================================================
-- KonnectATradie
-- Atomic, admin-only tradesperson verification decisions
-- =========================================================

create or replace function public.review_tradesperson_verification(
  p_tradesperson_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tradie public.tradesperson_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  if p_status not in ('verified', 'rejected') then
    raise exception 'Invalid verification status';
  end if;

  select *
  into v_tradie
  from public.tradesperson_profiles
  where id = p_tradesperson_id
  for update;

  if not found then
    raise exception 'Tradesperson not found';
  end if;

  if not exists (
    select 1
    from public.tradesperson_documents
    where tradesperson_id = p_tradesperson_id
  ) then
    raise exception 'At least one verification document is required';
  end if;

  update public.tradesperson_documents
  set
    verification_status = p_status,
    reviewed_at = now()
  where tradesperson_id = p_tradesperson_id;

  update public.tradesperson_profiles
  set
    verification_status = p_status,
    verified_at = case when p_status = 'verified' then now() else null end
  where id = p_tradesperson_id;
end;
$$;

revoke all on function public.review_tradesperson_verification(uuid, text) from public;
revoke all on function public.review_tradesperson_verification(uuid, text) from anon;
grant execute on function public.review_tradesperson_verification(uuid, text) to authenticated;
