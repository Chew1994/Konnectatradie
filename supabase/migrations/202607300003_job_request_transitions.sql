-- Enforce valid booking transitions and role-specific actions.

create or replace function public.enforce_job_request_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  old_status text := coalesce(old.lifecycle_status, old.status, 'requested');
  new_status text := coalesce(new.lifecycle_status, new.status);
  owns_tradie_profile boolean;
begin
  -- Both status columns must always agree.
  if new.status is distinct from new.lifecycle_status then
    raise exception 'status and lifecycle_status must match';
  end if;

  -- Ignore updates that do not change the lifecycle.
  -- RLS still controls whether the user may update the row.
  if new_status = old_status then
    return new;
  end if;

  -- Admins may perform manual corrections.
  if public.is_admin() then
    return new;
  end if;

  select exists (
    select 1
    from public.tradesperson_profiles tp
    where tp.id = old.tradesperson_id
      and tp.user_id = current_user_id
  )
  into owns_tradie_profile;

  -- All currently supported lifecycle actions belong to the assigned tradie.
  if not owns_tradie_profile then
    raise exception 'Only the assigned tradesperson may change this booking status';
  end if;

  if old_status = 'requested' and new_status in ('accepted', 'declined') then
    null;
  elsif old_status = 'accepted' and new_status = 'in_progress' then
    null;
  elsif old_status = 'in_progress' and new_status = 'completed' then
    null;
  else
    raise exception 'Invalid booking transition from % to %', old_status, new_status;
  end if;

  -- The database controls lifecycle timestamps.
  if new_status = 'accepted' then
    new.accepted_at := now();
  elsif new_status = 'declined' then
    new.declined_at := now();
  elsif new_status = 'in_progress' then
    new.started_at := now();
  elsif new_status = 'completed' then
    new.completed_at := now();
  end if;

  return new;
end;
$$;
drop trigger if exists job_request_transition_guard
on public.job_requests;

create trigger job_request_transition_guard
before update
on public.job_requests
for each row
execute function public.enforce_job_request_transition();