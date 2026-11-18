-- Beba initial Supabase schema: accounts, roles, carrier profiles,
-- identity verification, and business profiles.

create extension if not exists pgcrypto;

create type public.account_status as enum ('active', 'suspended', 'deleted');
create type public.user_role_name as enum ('sender', 'carrier', 'administrator');
create type public.role_status as enum ('pending', 'approved', 'suspended', 'rejected');
create type public.approval_status as enum ('draft', 'pending', 'approved', 'rejected', 'suspended');
create type public.verification_status as enum ('pending', 'approved', 'rejected', 'needs_more_information', 'expired');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone_number text,
  email text,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_phone_normalized check (phone_number is null or phone_number ~ '^2547[0-9]{8}$')
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role public.user_role_name not null,
  status public.role_status not null default 'approved',
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.carrier_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  carrier_type text,
  operating_towns text[] not null default '{}',
  delivery_methods text[] not null default '{}',
  vehicle_type text,
  vehicle_registration text,
  profile_description text,
  profile_photo_path text,
  approval_status public.approval_status not null default 'draft',
  active_status boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  verification_method text not null,
  identity_reference text,
  document_storage_path text,
  verification_status public.verification_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  registration_number text,
  business_phone text,
  business_email text,
  business_address text,
  business_type text,
  application_status public.approval_status not null default 'pending',
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  member_role text not null,
  membership_status public.role_status not null default 'pending',
  invited_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, phone_number, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    new.email
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

  insert into public.user_roles (user_id, role, status)
  values (new.id, 'sender', 'approved')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_carrier_profiles_updated_at before update on public.carrier_profiles
  for each row execute function public.set_updated_at();
create trigger set_business_profiles_updated_at before update on public.business_profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'administrator'
      and status = 'approved'
  );
$$;

alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.carrier_profiles enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.business_profiles enable row level security;
alter table public.business_members enable row level security;

create policy "Users can view their own profile"
  on public.users for select
  to authenticated
  using (id = auth.uid() or public.is_administrator());

create policy "Users can update their own profile"
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users can view their roles or administrator can view all"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.is_administrator());

create policy "Approved carriers are public"
  on public.carrier_profiles for select
  to anon, authenticated
  using (approval_status = 'approved' and active_status = true);

create policy "Carriers manage their own profile"
  on public.carrier_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Carriers update their own profile"
  on public.carrier_profiles for update
  to authenticated
  using (user_id = auth.uid() or public.is_administrator())
  with check (user_id = auth.uid() or public.is_administrator());

create policy "Users view their own identity verification"
  on public.identity_verifications for select
  to authenticated
  using (user_id = auth.uid() or public.is_administrator());

create policy "Users submit identity verification"
  on public.identity_verifications for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Only administrators update identity verification"
  on public.identity_verifications for update
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

create policy "Approved businesses are viewable"
  on public.business_profiles for select
  to authenticated
  using (
    application_status = 'approved'
    or exists (
      select 1 from public.business_members
      where business_id = business_profiles.id
        and user_id = auth.uid()
    )
    or public.is_administrator()
  );

create policy "Authenticated users create business applications"
  on public.business_profiles for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Administrators update business applications"
  on public.business_profiles for update
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

create policy "Members view their business memberships"
  on public.business_members for select
  to authenticated
  using (user_id = auth.uid() or public.is_administrator());

create policy "Administrators manage business memberships"
  on public.business_members for insert
  to authenticated
  with check (public.is_administrator());

create policy "Administrators update business memberships"
  on public.business_members for update
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

revoke all on public.users from anon;
revoke all on public.user_roles from anon;
revoke all on public.identity_verifications from anon;
revoke all on public.business_profiles from anon;
revoke all on public.business_members from anon;
