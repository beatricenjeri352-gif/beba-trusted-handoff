-- Draft: apply to hosted databases only after explicit approval.
create table public.sender_notifications (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references public.users(id) on delete cascade,
  delivery_request_id uuid not null references public.delivery_requests(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'status_changed', 'carrier_declined', 'charge_proposed')),
  delivery_status public.delivery_status,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index sender_notifications_inbox_idx
  on public.sender_notifications (sender_user_id, read_at, created_at desc);

alter table public.sender_notifications enable row level security;
revoke all on public.sender_notifications from public, anon, authenticated;
grant select on public.sender_notifications to authenticated;
grant update (read_at) on public.sender_notifications to authenticated;

create policy "Senders read their own notifications"
  on public.sender_notifications for select to authenticated
  using (sender_user_id = auth.uid());

create policy "Senders mark their own notifications read"
  on public.sender_notifications for update to authenticated
  using (sender_user_id = auth.uid())
  with check (sender_user_id = auth.uid());

create function public.notify_sender_delivery_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.sender_notifications (sender_user_id, delivery_request_id, event_type, delivery_status)
    values (new.sender_user_id, new.id, 'created', new.current_status);
  elsif new.current_status is distinct from old.current_status then
    insert into public.sender_notifications (sender_user_id, delivery_request_id, event_type, delivery_status)
    values (new.sender_user_id, new.id, 'status_changed', new.current_status);
  end if;
  return new;
end;
$$;

create trigger notify_sender_delivery_created
  after insert on public.delivery_requests
  for each row execute function public.notify_sender_delivery_status();

create trigger notify_sender_delivery_updated
  after update of current_status on public.delivery_requests
  for each row execute function public.notify_sender_delivery_status();

create function public.notify_sender_carrier_declined()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assignment_status = 'declined' and old.assignment_status is distinct from new.assignment_status then
    insert into public.sender_notifications (sender_user_id, delivery_request_id, event_type)
    select sender_user_id, id, 'carrier_declined'
    from public.delivery_requests where id = new.delivery_request_id;
  end if;
  return new;
end;
$$;

create trigger notify_sender_assignment_declined
  after update of assignment_status on public.delivery_assignments
  for each row execute function public.notify_sender_carrier_declined();

create function public.notify_sender_charge_proposed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.sender_notifications (sender_user_id, delivery_request_id, event_type)
  select sender_user_id, id, 'charge_proposed'
  from public.delivery_requests
  where id = new.delivery_request_id and sender_user_id <> new.proposed_by
    and new.sender_agreed_at is null and new.status = 'proposed';
  return new;
end;
$$;

create trigger notify_sender_new_charge
  after insert on public.negotiated_charges
  for each row execute function public.notify_sender_charge_proposed();

revoke all on function public.notify_sender_delivery_status() from public, anon, authenticated;
revoke all on function public.notify_sender_carrier_declined() from public, anon, authenticated;
revoke all on function public.notify_sender_charge_proposed() from public, anon, authenticated;
