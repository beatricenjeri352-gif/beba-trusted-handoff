create type public.delivery_quote_status as enum (
  'estimated',
  'confirmed',
  'revised',
  'expired'
);

create type public.negotiated_charge_status as enum (
  'proposed',
  'sender_agreed',
  'carrier_agreed',
  'approved',
  'declined',
  'cancelled'
);

create type public.commission_status as enum (
  'not_created',
  'payable',
  'under_review',
  'paid',
  'cancelled'
);

create table public.pricing_configurations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_fee_cents integer not null check (base_fee_cents >= 0),
  walking_rate_cents_per_km integer not null check (walking_rate_cents_per_km >= 0),
  bicycle_rate_cents_per_km integer not null check (bicycle_rate_cents_per_km >= 0),
  motorbike_rate_cents_per_km integer not null check (motorbike_rate_cents_per_km >= 0),
  car_rate_cents_per_km integer not null check (car_rate_cents_per_km >= 0),
  minimum_billable_distance_metres integer not null check (minimum_billable_distance_metres >= 0),
  commission_percent_hundredths integer not null check (commission_percent_hundredths between 0 and 10000),
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  changed_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table public.delivery_quotes (
  id uuid primary key default gen_random_uuid(),
  delivery_request_id uuid not null references public.delivery_requests(id) on delete cascade,
  pricing_configuration_id uuid not null references public.pricing_configurations(id),
  transport_method text not null check (transport_method in ('walking', 'bicycle', 'motorbike', 'car')),
  actual_route_distance_metres integer not null check (actual_route_distance_metres >= 0),
  minimum_billable_distance_metres integer not null check (minimum_billable_distance_metres >= 0),
  billable_distance_metres integer not null check (billable_distance_metres >= 0),
  base_fee_cents integer not null check (base_fee_cents >= 0),
  distance_rate_cents_per_km integer not null check (distance_rate_cents_per_km >= 0),
  distance_charge_cents integer not null check (distance_charge_cents >= 0),
  original_calculated_price_cents integer not null check (original_calculated_price_cents >= 0),
  final_agreed_price_cents integer not null check (final_agreed_price_cents >= 0),
  currency text not null default 'KES',
  commission_percent_hundredths integer not null check (commission_percent_hundredths between 0 and 10000),
  commission_amount_cents integer not null check (commission_amount_cents >= 0),
  route_provider text not null,
  route_reference text,
  quote_status public.delivery_quote_status not null default 'estimated',
  valid_until timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.negotiated_charges (
  id uuid primary key default gen_random_uuid(),
  delivery_quote_id uuid not null references public.delivery_quotes(id) on delete cascade,
  delivery_request_id uuid not null references public.delivery_requests(id) on delete cascade,
  proposed_amount_cents integer not null check (proposed_amount_cents >= 0),
  reason text not null,
  proposed_by uuid not null references public.users(id),
  sender_agreed_at timestamptz,
  carrier_agreed_at timestamptz,
  approved_by uuid references public.users(id),
  status public.negotiated_charge_status not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.commission_records (
  id uuid primary key default gen_random_uuid(),
  delivery_request_id uuid not null unique references public.delivery_requests(id) on delete restrict,
  delivery_quote_id uuid not null references public.delivery_quotes(id) on delete restrict,
  carrier_user_id uuid not null references public.users(id) on delete restrict,
  final_agreed_price_cents integer not null check (final_agreed_price_cents >= 0),
  commission_percent_hundredths integer not null check (commission_percent_hundredths between 0 and 10000),
  commission_amount_cents integer not null check (commission_amount_cents >= 0),
  calculation_basis text not null,
  status public.commission_status not null default 'payable',
  created_at timestamptz not null default now()
);

create trigger set_negotiated_charges_updated_at
  before update on public.negotiated_charges
  for each row execute function public.set_updated_at();

alter table public.pricing_configurations enable row level security;
alter table public.delivery_quotes enable row level security;
alter table public.negotiated_charges enable row level security;
alter table public.commission_records enable row level security;

create policy "Administrators manage pricing configurations"
  on public.pricing_configurations for all
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

create policy "Delivery participants view quotes"
  on public.delivery_quotes for select
  to authenticated
  using (
    public.is_administrator()
    or exists (
      select 1 from public.delivery_requests d
      where d.id = delivery_quotes.delivery_request_id
        and d.sender_user_id = auth.uid()
    )
    or exists (
      select 1 from public.delivery_assignments a
      where a.delivery_request_id = delivery_quotes.delivery_request_id
        and a.carrier_user_id = auth.uid()
        and a.assignment_status in ('pending_carrier_confirmation', 'accepted')
    )
  );

create policy "Delivery participants view negotiated charges"
  on public.negotiated_charges for select
  to authenticated
  using (
    public.is_administrator()
    or proposed_by = auth.uid()
    or exists (
      select 1 from public.delivery_requests d
      where d.id = negotiated_charges.delivery_request_id
        and d.sender_user_id = auth.uid()
    )
    or exists (
      select 1 from public.delivery_assignments a
      where a.delivery_request_id = negotiated_charges.delivery_request_id
        and a.carrier_user_id = auth.uid()
        and a.assignment_status in ('pending_carrier_confirmation', 'accepted')
    )
  );

create policy "Carrier proposes negotiated charges"
  on public.negotiated_charges for insert
  to authenticated
  with check (
    proposed_by = auth.uid()
    and exists (
      select 1 from public.delivery_assignments a
      where a.delivery_request_id = delivery_request_id
        and a.carrier_user_id = auth.uid()
        and a.assignment_status in ('pending_carrier_confirmation', 'accepted')
    )
  );

-- Negotiated charge updates are handled by purpose-specific security-definer functions.

create policy "Commission records are restricted"
  on public.commission_records for select
  to authenticated
  using (
    public.is_administrator()
    or carrier_user_id = auth.uid()
  );

insert into public.pricing_configurations (
  name,
  base_fee_cents,
  walking_rate_cents_per_km,
  bicycle_rate_cents_per_km,
  motorbike_rate_cents_per_km,
  car_rate_cents_per_km,
  minimum_billable_distance_metres,
  commission_percent_hundredths,
  status,
  effective_from
)
values (
  'Approved initial configuration',
  5000,
  1000,
  2000,
  2000,
  2000,
  5000,
  1000,
  'active',
  now()
);

create or replace function public.create_delivery_quote(
  delivery_id uuid,
  actual_route_distance_metres integer,
  route_provider text,
  route_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery_record public.delivery_requests%rowtype;
  assignment_record public.delivery_assignments%rowtype;
  carrier_profile public.carrier_profiles%rowtype;
  config public.pricing_configurations%rowtype;
  transport text;
  billable_metres integer;
  rate_cents integer;
  distance_charge_cents integer;
  base_fee_cents integer;
  original_price_cents integer;
  commission_cents integer;
  quote_id uuid;
begin
  if auth.role() != 'service_role' then
    raise exception 'Only the server-side pricing service can create delivery quotes';
  end if;

  if actual_route_distance_metres is null or actual_route_distance_metres < 0 then
    raise exception 'Actual route distance is required';
  end if;

  select * into delivery_record
  from public.delivery_requests
  where id = delivery_id;

  if delivery_record.id is null then
    raise exception 'Delivery not found';
  end if;

  select * into config
  from public.pricing_configurations
  where status = 'active'
    and effective_from <= now()
    and (effective_until is null or effective_until >= now())
  order by effective_from desc
  limit 1;

  if config.id is null then
    raise exception 'No active pricing configuration';
  end if;

  select * into assignment_record
  from public.delivery_assignments
  where delivery_request_id = delivery_id
    and assignment_status in ('pending_carrier_confirmation', 'accepted')
  order by created_at desc
  limit 1;

  if assignment_record.id is null then
    raise exception 'A carrier assignment is required for pricing';
  end if;

  select * into carrier_profile
  from public.carrier_profiles
  where user_id = assignment_record.carrier_user_id;

  transport := lower(coalesce(carrier_profile.vehicle_type, ''));
  if transport = 'motorcycle' then
    transport := 'motorbike';
  end if;

  if transport not in ('walking', 'bicycle', 'motorbike', 'car') then
    raise exception 'Unsupported carrier transport method';
  end if;

  billable_metres := greatest(actual_route_distance_metres, config.minimum_billable_distance_metres);

  if transport = 'walking' then
    rate_cents := config.walking_rate_cents_per_km;
  elsif transport = 'bicycle' then
    rate_cents := config.bicycle_rate_cents_per_km;
  elsif transport = 'motorbike' then
    rate_cents := config.motorbike_rate_cents_per_km;
  else
    rate_cents := config.car_rate_cents_per_km;
  end if;

  base_fee_cents := config.base_fee_cents;
  distance_charge_cents := floor((billable_metres * rate_cents + 500) / 1000);
  original_price_cents := base_fee_cents + distance_charge_cents;
  commission_cents := floor((original_price_cents * config.commission_percent_hundredths + 5000) / 10000);

  insert into public.delivery_quotes (
    delivery_request_id,
    pricing_configuration_id,
    transport_method,
    actual_route_distance_metres,
    minimum_billable_distance_metres,
    billable_distance_metres,
    base_fee_cents,
    distance_rate_cents_per_km,
    distance_charge_cents,
    original_calculated_price_cents,
    final_agreed_price_cents,
    currency,
    commission_percent_hundredths,
    commission_amount_cents,
    route_provider,
    route_reference,
    quote_status,
    valid_until
  )
  values (
    delivery_id,
    config.id,
    transport,
    actual_route_distance_metres,
    config.minimum_billable_distance_metres,
    billable_metres,
    base_fee_cents,
    rate_cents,
    distance_charge_cents,
    original_price_cents,
    original_price_cents,
    'KES',
    config.commission_percent_hundredths,
    commission_cents,
    route_provider,
    route_reference,
    'estimated',
    now() + interval '24 hours'
  )
  returning id into quote_id;

  return quote_id;
end;
$$;

create or replace function public.carrier_propose_negotiated_charge(
  delivery_id uuid,
  quote_id uuid,
  proposed_amount_cents integer,
  reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  charge_id uuid;
begin
  if proposed_amount_cents is null or proposed_amount_cents < 0 then
    raise exception 'Proposed amount must be non-negative';
  end if;
  if btrim(reason) = '' then
    raise exception 'A reason is required';
  end if;
  if not exists (
    select 1 from public.delivery_quotes q
    where q.id = quote_id
      and q.delivery_request_id = delivery_id
  ) then
    raise exception 'Quote does not belong to this delivery';
  end if;
  if not exists (
    select 1 from public.delivery_assignments a
    where a.delivery_request_id = delivery_id
      and a.carrier_user_id = auth.uid()
      and a.assignment_status in ('pending_carrier_confirmation', 'accepted')
  ) then
    raise exception 'Only the assigned carrier can propose an additional charge';
  end if;

  insert into public.negotiated_charges (
    delivery_quote_id,
    delivery_request_id,
    proposed_amount_cents,
    reason,
    proposed_by,
    status
  )
  values (
    quote_id,
    delivery_id,
    proposed_amount_cents,
    btrim(reason),
    auth.uid(),
    'proposed'
  )
  returning id into charge_id;

  return charge_id;
end;
$$;

create or replace function public.sender_agree_negotiated_charge(charge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  charge public.negotiated_charges%rowtype;
begin
  select * into charge
  from public.negotiated_charges
  where id = charge_id;

  if charge.id is null then
    raise exception 'Negotiated charge not found';
  end if;
  if not exists (
    select 1 from public.delivery_requests d
    where d.id = charge.delivery_request_id
      and d.sender_user_id = auth.uid()
  ) then
    raise exception 'Only the sender can agree to this charge';
  end if;

  update public.negotiated_charges
  set sender_agreed_at = coalesce(sender_agreed_at, now()),
      status = case when carrier_agreed_at is not null then 'carrier_agreed' else 'sender_agreed' end
  where id = charge_id;
end;
$$;

create or replace function public.carrier_agree_negotiated_charge(charge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  charge public.negotiated_charges%rowtype;
begin
  select * into charge
  from public.negotiated_charges
  where id = charge_id;

  if charge.id is null then
    raise exception 'Negotiated charge not found';
  end if;
  if not exists (
    select 1 from public.delivery_assignments a
    where a.delivery_request_id = charge.delivery_request_id
      and a.carrier_user_id = auth.uid()
      and a.assignment_status in ('pending_carrier_confirmation', 'accepted')
  ) then
    raise exception 'Only the assigned carrier can agree to this charge';
  end if;

  update public.negotiated_charges
  set carrier_agreed_at = coalesce(carrier_agreed_at, now()),
      status = case when sender_agreed_at is not null then 'carrier_agreed' else 'carrier_agreed' end
  where id = charge_id;
end;
$$;

create or replace function public.approve_negotiated_charge(charge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  charge public.negotiated_charges%rowtype;
  quote public.delivery_quotes%rowtype;
  approved_extra_cents integer;
  final_price_cents integer;
  commission_cents integer;
begin
  if not public.is_administrator() then
    raise exception 'Only an administrator can approve a negotiated charge';
  end if;

  select * into charge
  from public.negotiated_charges
  where id = charge_id;

  if charge.id is null then
    raise exception 'Negotiated charge not found';
  end if;
  if charge.sender_agreed_at is null or charge.carrier_agreed_at is null then
    raise exception 'Both sender and carrier must agree first';
  end if;

  select * into quote
  from public.delivery_quotes
  where id = charge.delivery_quote_id;

  select coalesce(sum(proposed_amount_cents), 0)
  into approved_extra_cents
  from public.negotiated_charges
  where delivery_quote_id = charge.delivery_quote_id
    and status = 'approved';

  approved_extra_cents := approved_extra_cents + charge.proposed_amount_cents;
  final_price_cents := quote.original_calculated_price_cents + approved_extra_cents;
  commission_cents := floor((final_price_cents * quote.commission_percent_hundredths + 5000) / 10000);

  update public.negotiated_charges
  set status = 'approved', approved_by = auth.uid(), updated_at = now()
  where id = charge_id;

  update public.delivery_quotes
  set final_agreed_price_cents = final_price_cents,
      commission_amount_cents = commission_cents,
      quote_status = 'revised'
  where id = charge.delivery_quote_id;
end;
$$;

create or replace function public.confirm_delivery_quote(delivery_id uuid, quote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quote_record public.delivery_quotes%rowtype;
begin
  select * into quote_record
  from public.delivery_quotes
  where id = quote_id
    and delivery_request_id = delivery_id;

  if quote_record.id is null then
    raise exception 'Quote not found';
  end if;
  if not exists (
    select 1 from public.delivery_requests d
    where d.id = delivery_id
      and d.sender_user_id = auth.uid()
  ) then
    raise exception 'Only the sender can confirm this quote';
  end if;

  update public.delivery_quotes
  set quote_status = 'confirmed', confirmed_at = now()
  where id = quote_id;

  update public.delivery_requests
  set accepted_quote_id = quote_id
  where id = delivery_id;
end;
$$;

create or replace function public.create_successful_delivery_commission(delivery_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery_record public.delivery_requests%rowtype;
  assignment_record public.delivery_assignments%rowtype;
  quote_record public.delivery_quotes%rowtype;
  commission_id uuid;
begin
  if auth.role() != 'service_role' then
    raise exception 'Only the server-side service can create commission records';
  end if;

  select * into delivery_record
  from public.delivery_requests
  where id = delivery_id;

  if delivery_record.id is null or delivery_record.current_status != 'completed' then
    raise exception 'Commission is created only after successful delivery confirmation';
  end if;

  select * into quote_record
  from public.delivery_quotes
  where delivery_request_id = delivery_id
  order by created_at desc
  limit 1;

  if quote_record.id is null then
    raise exception 'A final delivery quote is required';
  end if;

  select * into assignment_record
  from public.delivery_assignments
  where delivery_request_id = delivery_id
    and assignment_status = 'accepted'
  limit 1;

  if assignment_record.id is null then
    raise exception 'An accepted carrier assignment is required';
  end if;

  insert into public.commission_records (
    delivery_request_id,
    delivery_quote_id,
    carrier_user_id,
    final_agreed_price_cents,
    commission_percent_hundredths,
    commission_amount_cents,
    calculation_basis,
    status
  )
  values (
    delivery_id,
    quote_record.id,
    assignment_record.carrier_user_id,
    quote_record.final_agreed_price_cents,
    quote_record.commission_percent_hundredths,
    quote_record.commission_amount_cents,
    'Final approved Beba delivery price; private negotiated amounts excluded',
    'payable'
  )
  on conflict (delivery_request_id) do update
  set final_agreed_price_cents = excluded.final_agreed_price_cents,
      commission_percent_hundredths = excluded.commission_percent_hundredths,
      commission_amount_cents = excluded.commission_amount_cents,
      calculation_basis = excluded.calculation_basis;

  select id into commission_id
  from public.commission_records
  where delivery_request_id = delivery_id;

  return commission_id;
end;
$$;

revoke all on function public.carrier_propose_negotiated_charge(uuid, uuid, integer, text) from public, anon;
revoke all on function public.sender_agree_negotiated_charge(uuid) from public, anon;
revoke all on function public.carrier_agree_negotiated_charge(uuid) from public, anon;
revoke all on function public.approve_negotiated_charge(uuid) from public, anon;
revoke all on function public.create_successful_delivery_commission(uuid) from public, anon, authenticated;
revoke all on function public.confirm_delivery_quote(uuid, uuid) from public, anon;
grant execute on function public.confirm_delivery_quote(uuid, uuid) to authenticated;
grant execute on function public.carrier_propose_negotiated_charge(uuid, uuid, integer, text) to authenticated;
grant execute on function public.sender_agree_negotiated_charge(uuid) to authenticated;
grant execute on function public.carrier_agree_negotiated_charge(uuid) to authenticated;
grant execute on function public.approve_negotiated_charge(uuid) to authenticated;
grant execute on function public.create_successful_delivery_commission(uuid) to service_role;

revoke all on function public.create_delivery_quote(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.create_delivery_quote(uuid, integer, text, text) to service_role;
