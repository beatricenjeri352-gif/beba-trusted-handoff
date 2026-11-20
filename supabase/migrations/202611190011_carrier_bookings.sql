-- Carrier bookings: one carrier confirmation covering several deliveries from the same sender.
-- Additive: existing per-delivery assignments keep carrier_booking_id = null and behave as before.
-- DRAFT: not applied to any hosted project. Review, then apply only with explicit approval.

create table public.carrier_bookings (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references public.users(id) on delete restrict,
  carrier_user_id uuid not null references public.users(id) on delete restrict,
  booking_status text not null default 'pending_carrier_confirmation'
    check (booking_status in ('pending_carrier_confirmation', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger set_carrier_bookings_updated_at
  before update on public.carrier_bookings
  for each row execute function public.set_updated_at();

alter table public.delivery_assignments
  add column if not exists carrier_booking_id uuid references public.carrier_bookings(id) on delete restrict;

create index if not exists delivery_assignments_carrier_booking_id_idx
  on public.delivery_assignments(carrier_booking_id);

alter table public.carrier_bookings enable row level security;

grant select on public.carrier_bookings to authenticated;

-- No insert or update policies: bookings change only through the security definer functions below.
create policy "Booking participants view carrier bookings"
  on public.carrier_bookings for select
  to authenticated
  using (
    sender_user_id = auth.uid()
    or carrier_user_id = auth.uid()
    or public.is_administrator()
  );

create or replace function public.create_carrier_booking(
  p_carrier_user_id uuid,
  p_delivery_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_id uuid;
  delivery_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  if p_delivery_ids is null or cardinality(p_delivery_ids) = 0 then
    raise exception 'At least one delivery is required';
  end if;

  if not exists (
    select 1
    from public.carrier_profiles c
    where c.user_id = p_carrier_user_id
      and c.approval_status = 'approved'
      and c.active_status = true
  ) then
    raise exception 'Carrier is unavailable';
  end if;

  for delivery_id in select distinct unnest(p_delivery_ids) loop
    perform 1
    from public.delivery_requests d
    where d.id = delivery_id
      and d.sender_user_id = auth.uid()
      and d.current_status = 'draft'
    for update;

    if not found then
      raise exception 'Delivery is unavailable for carrier selection';
    end if;
  end loop;

  insert into public.carrier_bookings (sender_user_id, carrier_user_id)
  values (auth.uid(), p_carrier_user_id)
  returning id into booking_id;

  for delivery_id in select distinct unnest(p_delivery_ids) loop
    insert into public.delivery_assignments (
      delivery_request_id,
      carrier_user_id,
      selected_by_user_id,
      assignment_status,
      carrier_booking_id
    )
    values (
      delivery_id,
      p_carrier_user_id,
      auth.uid(),
      'pending_carrier_confirmation',
      booking_id
    );

    update public.delivery_requests
    set current_status = 'carrier_selected'
    where id = delivery_id;
  end loop;

  return booking_id;
end;
$$;

-- Adds a further draft delivery to a booking that the carrier has not answered yet.
create or replace function public.add_delivery_to_carrier_booking(
  p_booking_id uuid,
  p_delivery_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.carrier_bookings%rowtype;
  assignment_id uuid;
begin
  select * into booking_record
  from public.carrier_bookings
  where id = p_booking_id
    and sender_user_id = auth.uid()
    and booking_status = 'pending_carrier_confirmation'
  for update;

  if booking_record.id is null then
    raise exception 'Booking is unavailable';
  end if;

  perform 1
  from public.delivery_requests d
  where d.id = p_delivery_id
    and d.sender_user_id = auth.uid()
    and d.current_status = 'draft'
  for update;

  if not found then
    raise exception 'Delivery is unavailable for carrier selection';
  end if;

  insert into public.delivery_assignments (
    delivery_request_id,
    carrier_user_id,
    selected_by_user_id,
    assignment_status,
    carrier_booking_id
  )
  values (
    p_delivery_id,
    booking_record.carrier_user_id,
    auth.uid(),
    'pending_carrier_confirmation',
    p_booking_id
  )
  returning id into assignment_id;

  update public.delivery_requests
  set current_status = 'carrier_selected'
  where id = p_delivery_id;

  return assignment_id;
end;
$$;

-- One carrier answer applies to every pending delivery in the booking.
create or replace function public.respond_to_carrier_booking(
  p_booking_id uuid,
  p_response public.assignment_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.carrier_bookings%rowtype;
begin
  if p_response not in ('accepted', 'declined') then
    raise exception 'Invalid booking response';
  end if;

  select * into booking_record
  from public.carrier_bookings
  where id = p_booking_id
    and carrier_user_id = auth.uid()
    and booking_status = 'pending_carrier_confirmation'
  for update;

  if booking_record.id is null then
    raise exception 'Booking is unavailable';
  end if;

  update public.carrier_bookings
  set booking_status = p_response::text,
      responded_at = now()
  where id = p_booking_id;

  update public.delivery_assignments
  set assignment_status = p_response,
      responded_at = now(),
      accepted_at = case when p_response = 'accepted' then now() else null end
  where carrier_booking_id = p_booking_id
    and assignment_status = 'pending_carrier_confirmation';

  if p_response = 'accepted' then
    update public.delivery_requests
    set current_status = 'carrier_confirmed'
    where id in (
      select delivery_request_id
      from public.delivery_assignments
      where carrier_booking_id = p_booking_id
        and assignment_status = 'accepted'
    );
  end if;
end;
$$;

revoke all on function public.create_carrier_booking(uuid, uuid[]) from public, anon;
revoke all on function public.add_delivery_to_carrier_booking(uuid, uuid) from public, anon;
revoke all on function public.respond_to_carrier_booking(uuid, public.assignment_status) from public, anon;

grant execute on function public.create_carrier_booking(uuid, uuid[]) to authenticated;
grant execute on function public.add_delivery_to_carrier_booking(uuid, uuid) to authenticated;
grant execute on function public.respond_to_carrier_booking(uuid, public.assignment_status) to authenticated;
