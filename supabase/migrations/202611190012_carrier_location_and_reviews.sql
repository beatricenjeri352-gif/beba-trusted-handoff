-- Carrier live location (while online) and sender reviews for completed deliveries.
-- DRAFT: not applied to hosted Supabase. Requires explicit user approval before applying.

create table public.carrier_locations (
  carrier_user_id uuid primary key references public.users(id) on delete cascade,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  updated_at timestamptz not null default now()
);

alter table public.carrier_locations enable row level security;

-- Senders never read carrier coordinates directly. Distances are computed server-side with the service role.
create policy "Carriers view their own location"
  on public.carrier_locations for select
  to authenticated
  using (carrier_user_id = auth.uid());

create policy "Approved carriers publish their own location"
  on public.carrier_locations for insert
  to authenticated
  with check (
    carrier_user_id = auth.uid()
    and exists (
      select 1
      from public.carrier_profiles p
      where p.user_id = auth.uid()
        and p.approval_status = 'approved'
        and p.active_status = true
    )
  );

create policy "Carriers update their own location"
  on public.carrier_locations for update
  to authenticated
  using (carrier_user_id = auth.uid())
  with check (carrier_user_id = auth.uid());

create policy "Carriers remove their own location"
  on public.carrier_locations for delete
  to authenticated
  using (carrier_user_id = auth.uid());

create table public.delivery_reviews (
  id uuid primary key default gen_random_uuid(),
  delivery_request_id uuid not null unique references public.delivery_requests(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete cascade,
  carrier_user_id uuid not null references public.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

alter table public.delivery_reviews enable row level security;

create policy "Authenticated users read delivery reviews"
  on public.delivery_reviews for select
  to authenticated
  using (true);

create policy "Senders review their completed deliveries"
  on public.delivery_reviews for insert
  to authenticated
  with check (
    sender_user_id = auth.uid()
    and exists (
      select 1
      from public.delivery_requests d
      join public.delivery_assignments a on a.delivery_request_id = d.id
      where d.id = delivery_reviews.delivery_request_id
        and d.sender_user_id = auth.uid()
        and d.current_status = 'completed'
        and a.carrier_user_id = delivery_reviews.carrier_user_id
    )
  );
