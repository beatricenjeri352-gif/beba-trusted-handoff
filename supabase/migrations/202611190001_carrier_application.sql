-- Allow carriers to view and maintain their own application and profile.

create policy "Carriers view their own application"
  on public.carrier_profiles for select
  to authenticated
  using (user_id = auth.uid() or public.is_administrator());

create or replace function public.apply_for_carrier()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role, status)
  values (auth.uid(), 'carrier', 'pending')
  on conflict (user_id, role)
  do update set status = 'pending';
end;
$$;

revoke all on function public.apply_for_carrier() from public;
grant execute on function public.apply_for_carrier() to authenticated;
