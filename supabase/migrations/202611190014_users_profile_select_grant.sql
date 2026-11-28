-- Fix: signed-in users got "permission denied for table users" (42501) when
-- loading their own profile on /deliveries.
--
-- The row-level policy "Users can view their own profile" (202611180001) already
-- limits reads to the user's own row (or administrators), but the authenticated
-- role was never granted table-level SELECT, so Postgres refused the query before
-- RLS was evaluated. Other tables received explicit grants in 0004/0005/0007.
--
-- Only SELECT is granted. Profile writes still go through the auth trigger and
-- server-side code; granting UPDATE would let users change account_status.

grant usage on schema public to authenticated;
grant select on public.users to authenticated;
