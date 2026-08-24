-- =========================================================
-- Secure tradesperson responses to completed-job reviews
-- =========================================================

alter table public.reviews
  add column if not exists tradesperson_response text,
  add column if not exists tradesperson_responded_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reviews'::regclass
      and conname = 'reviews_tradesperson_response_length'
  ) then
    alter table public.reviews
      add constraint reviews_tradesperson_response_length
      check (
        tradesperson_response is null
        or char_length(btrim(tradesperson_response)) between 1 and 1000
      );
  end if;
end
$$;

create or replace function public.respond_to_review(
  p_review_id uuid,
  p_response text
)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_review public.reviews;
  v_response text := btrim(coalesce(p_response, ''));
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_response) not between 1 and 1000 then
    raise exception 'Response must be between 1 and 1000 characters';
  end if;

  select r.*
  into v_review
  from public.reviews r
  join public.tradesperson_profiles tp
    on tp.id = r.tradesperson_id
  where r.id = p_review_id
    and tp.user_id = v_user_id
  for update of r;

  if not found then
    raise exception 'Review not found or you are not authorised to respond';
  end if;

  update public.reviews
  set
    tradesperson_response = v_response,
    tradesperson_responded_at = now()
  where id = p_review_id
  returning * into v_review;

  return v_review;
end;
$$;

revoke all on function public.respond_to_review(uuid, text) from public;
revoke all on function public.respond_to_review(uuid, text) from anon;
grant execute on function public.respond_to_review(uuid, text) to authenticated;
