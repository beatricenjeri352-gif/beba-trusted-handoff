-- Restore table privileges and ensure delivery insertion is possible for authenticated senders.

grant usage on schema public to authenticated;
grant select, insert, update on public.delivery_requests to authenticated;
grant select, insert, update on public.delivery_stops to authenticated;

drop policy if exists "Senders create delivery requests" on public.delivery_requests;
create policy "Senders create delivery requests"
  on public.delivery_requests for insert
  to authenticated
  with check (sender_user_id = auth.uid());

drop policy if exists "Senders create stops for their deliveries" on public.delivery_stops;
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
