-- Restore authenticated carrier-profile access and remove ambiguity between
-- public approved-profile visibility and a carrier viewing its own application.

grant usage on schema public to authenticated;
grant select, insert, update on public.carrier_profiles to authenticated;

drop policy if exists "Approved or own carrier profiles" on public.carrier_profiles;
create policy "Approved or own carrier profiles"
  on public.carrier_profiles for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_administrator()
    or (approval_status = 'approved' and active_status = true)
  );

drop policy if exists "Approved carriers are public" on public.carrier_profiles;

drop policy if exists "Carriers manage their own profile" on public.carrier_profiles;
create policy "Carriers manage their own profile"
  on public.carrier_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Carriers update their own profile" on public.carrier_profiles;
create policy "Carriers update their own profile"
  on public.carrier_profiles for update
  to authenticated
  using (user_id = auth.uid() or public.is_administrator())
  with check (user_id = auth.uid() or public.is_administrator());

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

revoke all on function public.apply_for_carrier() from public, anon;
grant execute on function public.apply_for_carrier() to authenticated;
