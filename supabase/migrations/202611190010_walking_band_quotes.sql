-- Walking band pricing (approved by the user), replacing the distance formula for new quotes.
-- Additive: existing quotes keep pricing_model = 'legacy_distance' and their original values.
-- Applied to the hosted Beba project after explicit approval and verified read-only.

alter table public.delivery_quotes
  add column if not exists pricing_model text not null default 'legacy_distance'
    check (pricing_model in ('legacy_distance', 'walking_band'));

-- Drop the 5 km minimum check (named by Postgres from the original inline definition) so walking-band quotes can store 0.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.delivery_quotes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%minimum_billable_distance_metres = 5000%'
  loop
    execute format('alter table public.delivery_quotes drop constraint %I', constraint_row.conname);
  end loop;
end;
$$;

alter table public.delivery_quotes
  add constraint delivery_quotes_minimum_billable_by_model_check check (
    (pricing_model = 'legacy_distance' and minimum_billable_distance_metres = 5000)
    or (pricing_model = 'walking_band' and minimum_billable_distance_metres = 0)
  );

-- Walking fee bands in cents. Must match lib/pricing/walking-bands.ts.
-- Returns null when the walking distance is over 3000 m (too far to walk).
create or replace function public.walking_band_fee_cents(distance_metres integer)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when distance_metres is null or distance_metres < 0 then null
    when distance_metres <= 500 then 6000
    when distance_metres <= 1200 then 10000
    when distance_metres <= 2000 then 15000
    when distance_metres <= 3000 then 20000
    else null
  end;
$$;

revoke all on function public.walking_band_fee_cents(integer) from public, anon, authenticated;
grant execute on function public.walking_band_fee_cents(integer) to service_role;

create or replace function public.create_walking_delivery_quote(
  delivery_id uuid,
  walking_distance_metres integer,
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
  config public.pricing_configurations%rowtype;
  fee_cents integer;
  commission_cents integer;
  quote_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only the server-side pricing service can create delivery quotes';
  end if;

  if walking_distance_metres is null or walking_distance_metres < 0 then
    raise exception 'Walking route distance is required';
  end if;
  if route_provider is null or btrim(route_provider) = '' then
    raise exception 'A route provider is required';
  end if;

  fee_cents := public.walking_band_fee_cents(walking_distance_metres);
  if fee_cents is null then
    raise exception 'TOO_FAR_TO_WALK';
  end if;

  select * into delivery_record
  from public.delivery_requests
  where id = delivery_id
  for update;

  if delivery_record.id is null then
    raise exception 'Delivery not found';
  end if;
  if delivery_record.current_status not in ('draft', 'carrier_selected', 'carrier_confirmed') then
    raise exception 'A quote is only available before delivery begins';
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
  if exists (
    select 1
    from public.negotiated_charges
    where delivery_request_id = delivery_id
      and status not in ('declined', 'cancelled')
  ) then
    raise exception 'Resolve negotiated charges before creating another quote';
  end if;

  -- Commission: 10% of the fee, rounded to the nearest whole shilling (half up), stored in cents.
  commission_cents := floor((fee_cents::numeric * 10 + 5000) / 10000)::integer * 100;

  insert into public.delivery_quotes (
    delivery_request_id,
    pricing_configuration_id,
    transport_method,
    pricing_model,
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
    'walking',
    'walking_band',
    walking_distance_metres,
    0,
    walking_distance_metres,
    fee_cents,
    0,
    0,
    fee_cents,
    fee_cents,
    'KES',
    config.commission_percent_hundredths,
    commission_cents,
    route_provider,
    route_reference,
    'estimated',
    null
  )
  returning id into quote_id;

  return quote_id;
end;
$$;

revoke all on function public.create_walking_delivery_quote(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.create_walking_delivery_quote(uuid, integer, text, text) to service_role;
