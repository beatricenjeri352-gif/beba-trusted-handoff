-- Allow a signed-in user to create a missing public profile record.
-- This makes profile saving reliable if the auth trigger was not present
-- when the account was originally created.

create policy "Users can insert their own profile"
  on public.users for insert
  to authenticated
  with check (id = auth.uid());
