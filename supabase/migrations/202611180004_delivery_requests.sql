create type public.delivery_method as enum ('within_town', 'to_stage', 'intertown');
create type public.delivery_status as enum (
  'draft',
  'awaiting_carrier',
  'carrier_selected',
  'awaiting_carrier_confirmation',
  'carrier_confirmed',
  'goods_collected',
  'in_transit',
  'at_handover_point',
  'awaiting_receiver_confirmation',
  'completed',
  'cancelled',
  'failed',
  'under_review',
  'disputed',
  'returned'
);
create type public.delivery_stop_type as enum ('pickup', 'handover', 'destination');

create table public.delivery_requests (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  sender_user_id uuid not null references public.users(id) on delete restrict,
  business_id uuid references public.business_profiles(id) on delete set null,
  delivery_method public.delivery_method not null,
  parcel_description text not null,
  parcel_size text,
  weight_kg numeric(10,2) check (weight_kg is null or weight_kg >= 0),
  current_status public.delivery_status not null default 'draft',
  accepted_quote_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_stops (
  id uuid primary key default gen_random_uuid(),
  delivery_request_id uuid not null references public.delivery_requests(id) on delete cascade,
  stop_type public.delivery_stop_type not null,
  sequence_number integer not null check (sequence_number >= 1),
  location_name text,
  address text,
  town text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  contact_name text,
  contact_phone text,
  instructions text,
  created_at timestamptz not null default now(),
  unique (delivery_request_id, stop_type, sequence_number)
);

create or replace function public.assign_delivery_tracking_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tracking_number is null or btrim(new.tracking_number) = '' then
    new.tracking_number := 'BEBA-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

create trigger set_delivery_tracking_number
  before insert on public.delivery_requests
  for each row execute function public.assign_delivery_tracking_number();

create trigger set_delivery_requests_updated_at
  before update on public.delivery_requests
  for each row execute function public.set_updated_at();

alter table public.delivery_requests enable row level security;
alter table public.delivery_stops enable row level security;

create policy "Senders view their own deliveries"
  on public.delivery_requests for select
  to authenticated
  using (sender_user_id = auth.uid() or public.is_administrator());

create policy "Senders create delivery requests"
  on public.delivery_requests for insert
  to authenticated
  with check (sender_user_id = auth.uid());

create policy "Senders update their draft deliveries"
  on public.delivery_requests for update
  to authenticated
  using (
    sender_user_id = auth.uid()
    and current_status = 'draft'
  )
  with check (
    sender_user_id = auth.uid()
    and current_status = 'draft'
  );

create policy "Administrators update delivery requests"
  on public.delivery_requests for update
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

create policy "Delivery participants view their stops"
  on public.delivery_stops for select
  to authenticated
  using (
    public.is_administrator()
    or exists (
      select 1
      from public.delivery_requests d
      where d.id = delivery_stops.delivery_request_id
        and d.sender_user_id = auth.uid()
    )
  );

create policy "Senders create stops for their deliveries"
  on public.delivery_stops for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.delivery_requests d
      where d.id = delivery_request_id
        and d.sender_user_id = auth.uid()
        and d.current_status = 'draft'
    )
  );

create policy "Senders update stops on their draft deliveries"
  on public.delivery_stops for update
  to authenticated
  using (
    exists (
      select 1
      from public.delivery_requests d
      where d.id = delivery_stops.delivery_request_id
        and d.sender_user_id = auth.uid()
        and d.current_status = 'draft'
    )
  )
  with check (
    exists (
      select 1
      from public.delivery_requests d
      where d.id = delivery_request_id
        and d.sender_user_id = auth.uid()
        and d.current_status = 'draft'
    )
  );
