create type public.delivery_quote_status as enum (
  'estimated',
  'confirmed',
  'revised',
  'expired'
);

create type public.price_adjustment_status as enum (
  'requested',
  'sender_agreed',
  'carrier_agreed',
  'approved',
  'declined',
  'cancelled'
);

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  delivery_method public.delivery_method not null,
  base_fee numeric(12,2) not null check (base_fee >= 0),
  distance_rate numeric(12,4) not null check (distance_rate >= 0),
  parcel_size_rate numeric(12,2) not null check (parcel_size_rate >= 0),
  parcel_weight_rate numeric(12,4) not null check (parcel_weight_rate >= 0),
  service_charge numeric(12,2) not null default 0 check (service_charge >= 0),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table public.delivery_quotes (
  id uuid primary key default gen_random_uuid(),
  delivery_request_id uuid not null references public.delivery_requests(id) on delete cascade,
  pricing_rule_id uuid references public.pricing_rules(id),
  base_fee numeric(12,2) not null check (base_fee >= 0),
  distance_charge numeric(12,2) not null check (distance_charge >= 0),
  parcel_charge numeric(12,2) not null check (parcel_charge >= 0),
  service_charge numeric(12,2) not null check (service_charge >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  currency text not null default 'KES',
  distance_km numeric(10,3),
  quote_status public.delivery_quote_status not null default 'estimated',
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table public.price_adjustments (
  id uuid primary key default gen_random_uuid(),
  delivery_request_id uuid not null references public.delivery_requests(id) on delete cascade,
  original_amount numeric(12,2) not null check (original_amount >= 0),
  proposed_amount numeric(12,2) not null check (proposed_amount >= 0),
  reason text not null,
  requested_by uuid not null references public.users(id),
  approved_by uuid references public.users(id),
  sender_agreed_at timestamptz,
  carrier_agreed_at timestamptz,
  adjustment_status public.price_adjustment_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_price_adjustments_updated_at
  before update on public.price_adjustments
  for each row execute function public.set_updated_at();

alter table public.pricing_rules enable row level security;
alter table public.delivery_quotes enable row level security;
alter table public.price_adjustments enable row level security;

create policy "Administrators manage pricing rules"
  on public.pricing_rules for all
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

create policy "Delivery participants view quotes"
  on public.delivery_quotes for select
  to authenticated
  using (
    public.is_administrator()
    or exists (
      select 1
      from public.delivery_requests d
      where d.id = delivery_quotes.delivery_request_id
        and d.sender_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.delivery_assignments a
      where a.delivery_request_id = delivery_quotes.delivery_request_id
        and a.carrier_user_id = auth.uid()
        and a.assignment_status in ('pending_carrier_confirmation', 'accepted')
    )
  );

create policy "Administrators manage quotes"
  on public.delivery_quotes for all
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

create policy "Delivery participants view adjustments"
  on public.price_adjustments for select
  to authenticated
  using (
    public.is_administrator()
    or exists (
      select 1
      from public.delivery_requests d
      where d.id = price_adjustments.delivery_request_id
        and d.sender_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.delivery_assignments a
      where a.delivery_request_id = price_adjustments.delivery_request_id
        and a.carrier_user_id = auth.uid()
    )
  );

create policy "Participants request price adjustments"
  on public.price_adjustments for insert
  to authenticated
  with check (
    requested_by = auth.uid()
    and (
      exists (
        select 1
        from public.delivery_requests d
        where d.id = delivery_request_id
          and d.sender_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.delivery_assignments a
        where a.delivery_request_id = delivery_request_id
          and a.carrier_user_id = auth.uid()
          and a.assignment_status in ('pending_carrier_confirmation', 'accepted')
      )
    )
  );

create or replace function public.calculate_delivery_quote(delivery_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery_record public.delivery_requests%rowtype;
  pickup_stop public.delivery_stops%rowtype;
  destination_stop public.delivery_stops%rowtype;
  rule public.pricing_rules%rowtype;
  distance_km numeric;
  parcel_charge numeric;
  distance_charge numeric;
  total_amount numeric;
  quote_id uuid;
begin
  select * into delivery_record
  from public.delivery_requests
  where id = delivery_id
    and sender_user_id = auth.uid();

  if delivery_record.id is null then
    raise exception 'Delivery not found';
  end if;

  select * into rule
  from public.pricing_rules
  where delivery_method = delivery_record.delivery_method
    and status = 'active'
    and effective_from <= now()
    and (effective_until is null or effective_until >= now())
  order by effective_from desc
  limit 1;

  if rule.id is null then
    raise exception 'No active pricing rule configured';
  end if;

  select * into pickup_stop
  from public.delivery_stops
  where delivery_request_id = delivery_id
    and stop_type = 'pickup'
  order by sequence_number
  limit 1;

  select * into destination_stop
  from public.delivery_stops
  where delivery_request_id = delivery_id
    and stop_type = 'destination'
  order by sequence_number
  limit 1;

  if pickup_stop.latitude is null or pickup_stop.longitude is null
     or destination_stop.latitude is null or destination_stop.longitude is null then
    distance_km := 0;
  else
    distance_km := 6371 * 2 * asin(
      sqrt(
        pow(sin(radians(destination_stop.latitude - pickup_stop.latitude) / 2), 2)
        + cos(radians(pickup_stop.latitude))
        * cos(radians(destination_stop.latitude))
        * pow(sin(radians(destination_stop.longitude - pickup_stop.longitude) / 2), 2)
      )
    );
  end if;

  distance_charge := round(distance_km * rule.distance_rate, 2);

  parcel_charge := rule.parcel_size_rate
    * case delivery_record.parcel_size
      when 'small' then 0.5
      when 'medium' then 1
      when 'large' then 1.5
      else 1
    end
    + coalesce(delivery_record.weight_kg, 0) * rule.parcel_weight_rate;

  parcel_charge := round(parcel_charge, 2);
  total_amount := round(rule.base_fee + distance_charge + parcel_charge + rule.service_charge, 2);

  insert into public.delivery_quotes (
    delivery_request_id,
    pricing_rule_id,
    base_fee,
    distance_charge,
    parcel_charge,
    service_charge,
    total_amount,
    currency,
    distance_km,
    quote_status,
    valid_until
  )
  values (
    delivery_id,
    rule.id,
    rule.base_fee,
    distance_charge,
    parcel_charge,
    rule.service_charge,
    total_amount,
    'KES',
    round(distance_km, 3),
    'estimated',
    now() + interval '24 hours'
  )
  returning id into quote_id;

  return quote_id;
end;
$$;

revoke all on function public.calculate_delivery_quote(uuid) from public;
grant execute on function public.calculate_delivery_quote(uuid) to authenticated;
