create type public.assignment_status as enum (
  'pending_carrier_confirmation',
  'accepted',
  'declined',
  'cancelled',
  'completed'
);

create table public.delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  delivery_request_id uuid not null references public.delivery_requests(id) on delete cascade,
  carrier_user_id uuid not null references public.users(id) on delete restrict,
  selected_by_user_id uuid not null references public.users(id) on delete restrict,
  assignment_status public.assignment_status not null default 'pending_carrier_confirmation',
  selected_at timestamptz not null default now(),
  responded_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index one_active_assignment_per_delivery
  on public.delivery_assignments(delivery_request_id)
  where assignment_status in ('pending_carrier_confirmation', 'accepted');

alter table public.delivery_assignments enable row level security;

create policy "Participants view delivery assignments"
  on public.delivery_assignments for select
  to authenticated
  using (
    selected_by_user_id = auth.uid()
    or carrier_user_id = auth.uid()
    or public.is_administrator()
  );

create policy "Senders select approved carriers"
  on public.delivery_assignments for insert
  to authenticated
  with check (
    selected_by_user_id = auth.uid()
    and exists (
      select 1
      from public.delivery_requests d
      where d.id = delivery_request_id
        and d.sender_user_id = auth.uid()
        and d.current_status = 'draft'
    )
    and exists (
      select 1
      from public.carrier_profiles c
      where c.user_id = carrier_user_id
        and c.approval_status = 'approved'
        and c.active_status = true
    )
  );

create policy "Selected carriers respond"
  on public.delivery_assignments for update
  to authenticated
  using (
    carrier_user_id = auth.uid()
    and assignment_status = 'pending_carrier_confirmation'
  )
  with check (
    carrier_user_id = auth.uid()
    and assignment_status in ('accepted', 'declined')
  );

create policy "Administrators manage delivery assignments"
  on public.delivery_assignments for update
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

create or replace function public.respond_to_delivery_assignment(
  assignment_id uuid,
  response public.assignment_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_record public.delivery_assignments%rowtype;
begin
  if response not in ('accepted', 'declined') then
    raise exception 'Invalid assignment response';
  end if;

  select * into assignment_record
  from public.delivery_assignments
  where id = assignment_id
    and carrier_user_id = auth.uid()
    and assignment_status = 'pending_carrier_confirmation';

  if assignment_record.id is null then
    raise exception 'Assignment is unavailable';
  end if;

  update public.delivery_assignments
  set assignment_status = response,
      responded_at = now(),
      accepted_at = case when response = 'accepted' then now() else null end
  where id = assignment_id;

  if response = 'accepted' then
    update public.delivery_requests
    set current_status = 'carrier_confirmed'
    where id = assignment_record.delivery_request_id;
  end if;
end;
$$;

revoke all on function public.respond_to_delivery_assignment(uuid, public.assignment_status) from public;
grant execute on function public.respond_to_delivery_assignment(uuid, public.assignment_status) to authenticated;
