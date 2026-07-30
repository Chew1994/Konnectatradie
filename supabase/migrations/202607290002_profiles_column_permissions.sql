begin;

-- Prevent ordinary users from changing administrator-controlled fields.
-- Administrators can still update these fields.

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.blocked is distinct from old.blocked
       or new.blocked_reason is distinct from old.blocked_reason then
      raise exception 'You are not allowed to update administrator-controlled profile fields.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_admin_fields
on public.profiles;

create trigger protect_profile_admin_fields
before update on public.profiles
for each row
execute function public.protect_profile_admin_fields();

commit;