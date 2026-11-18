-- Allow Kenyan mobile numbers in E.164 (+254...) or stored 254... format,
-- and normalize them consistently when an auth account is created.

alter table public.users
  drop constraint if exists users_phone_normalized;

alter table public.users
  add constraint users_phone_normalized
  check (phone_number is null or phone_number ~ '^2547[0-9]{8}$');

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_phone text;
  digits text;
begin
  raw_phone := coalesce(new.phone, new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'phone_number');
  digits := regexp_replace(coalesce(raw_phone, ''), '[^0-9]', '', 'g');

  if digits like '254%' then
    digits := digits;
  elsif digits like '7%' and length(digits) = 9 then
    digits := '254' || digits;
  elsif digits like '0%' and length(digits) = 10 then
    digits := '254' || substr(digits, 2);
  else
    digits := null;
  end if;

  insert into public.users (id, full_name, phone_number, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    digits,
    new.email
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone_number = excluded.phone_number,
    email = excluded.email,
    updated_at = now();

  insert into public.user_roles (user_id, role, status)
  values (new.id, 'sender', 'approved')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;
