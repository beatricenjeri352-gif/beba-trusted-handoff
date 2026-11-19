-- Carriers may submit or withdraw an application but must not approve or activate
-- their own profile. Administrators and the service role keep full control.

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

drop trigger if exists guard_carrier_profile_status on public.carrier_profiles;
create trigger guard_carrier_profile_status
  before insert or update on public.carrier_profiles
  for each row execute function public.guard_carrier_profile_status();

-- The negotiated-charge insert check must compare against the row being inserted,
-- not against the assignment table's own column.
drop policy if exists "Carrier proposes negotiated charges" on public.negotiated_charges;
create policy "Carrier proposes negotiated charges"
  on public.negotiated_charges for insert
  to authenticated
  with check (
    proposed_by = auth.uid()
    and exists (
      select 1 from public.delivery_assignments a
      where a.delivery_request_id = negotiated_charges.delivery_request_id
        and a.carrier_user_id = auth.uid()
        and a.assignment_status in ('pending_carrier_confirmation', 'accepted')
    )
  );
