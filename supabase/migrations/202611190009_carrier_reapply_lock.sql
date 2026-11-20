-- A rejected or suspended carrier cannot apply again or change their profile until
-- an administrator restores the account. Administrators and the service role keep
-- full control, so restoring an account is done by updating the status directly.

create or replace function public.apply_for_carrier()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = 'carrier'
      and status in ('rejected', 'suspended')
  ) or exists (
    select 1 from public.carrier_profiles
    where user_id = auth.uid()
      and approval_status in ('rejected', 'suspended')
  ) then
    raise exception 'Rejected or suspended carrier accounts cannot apply again until an administrator approves them';
  end if;

  insert into public.user_roles (user_id, role, status)
  values (auth.uid(), 'carrier', 'pending')
  on conflict (user_id, role)
  do update set status = 'pending';
end;
$$;

revoke all on function public.apply_for_carrier() from public, anon;
grant execute on function public.apply_for_carrier() to authenticated;

create or replace function public.guard_carrier_profile_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_administrator() then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.approval_status in ('rejected', 'suspended') then
    raise exception 'Rejected or suspended carrier profiles cannot be changed until an administrator restores them';
  end if;

  if tg_op = 'UPDATE'
    and new.approval_status is not distinct from old.approval_status
    and new.active_status is not distinct from old.active_status then
    return new;
  end if;

  if new.approval_status not in ('draft', 'pending') or new.active_status then
    raise exception 'Carriers cannot approve or activate their own profile';
  end if;

  return new;
end;
$$;
