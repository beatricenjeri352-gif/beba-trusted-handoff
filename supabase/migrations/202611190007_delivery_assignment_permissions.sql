-- Keep assignment reads behind RLS and perform carrier selection atomically.

grant usage on schema public to authenticated;
grant select on public.delivery_assignments to authenticated;

create or replace function public.select_delivery_carrier(
  p_delivery_id uuid,
  p_carrier_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery_record public.delivery_requests%rowtype;
  assignment_id uuid;
begin
  select * into delivery_record
  from public.delivery_requests
  where id = p_delivery_id
    and sender_user_id = auth.uid()
    and current_status = 'draft'
  for update;

  if delivery_record.id is null then
    raise exception 'Delivery is unavailable for carrier selection';
  end if;

  if not exists (
    select 1
    from public.carrier_profiles
    where user_id = p_carrier_user_id
      and approval_status = 'approved'
      and active_status = true
  ) then
    raise exception 'Carrier is unavailable';
  end if;

  insert into public.delivery_assignments (
    delivery_request_id,
    carrier_user_id,
    selected_by_user_id,
    assignment_status
  )
  values (
    p_delivery_id,
    p_carrier_user_id,
    auth.uid(),
    'pending_carrier_confirmation'
  )
  returning id into assignment_id;

  update public.delivery_requests
  set current_status = 'carrier_selected'
  where id = p_delivery_id;

  return assignment_id;
end;
$$;

revoke all on function public.select_delivery_carrier(uuid, uuid) from public, anon;
grant execute on function public.select_delivery_carrier(uuid, uuid) to authenticated;
