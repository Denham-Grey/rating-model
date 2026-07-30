-- profiles had no UPDATE policy at all. Step 6 of the rewiring work requires
-- a user to be able to clear their own must_change_password flag after a
-- forced password change. Add a narrowly-scoped self-update path:
--   - a user may update their own row (auth.uid() = id)
--   - a guard trigger blocks changes to role/status/username/email/id from
--     any non-service-role caller, so this can never be used for privilege
--     escalation (becoming admin) or self-reactivation after a suspension.
-- Admin-driven changes to role/status/username/email go through the
-- create-user / set-status / admin-reset-password Edge Functions, which use
-- the service_role key and are exempted from the guard below.

create or replace function public.enforce_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.username is distinct from old.username
     or new.email is distinct from old.email
     or new.id is distinct from old.id then
    raise exception 'Only an administrator can change role, status, username, email, or id.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profile_self_update_trigger on public.profiles;
create trigger enforce_profile_self_update_trigger
  before update on public.profiles
  for each row
  execute function public.enforce_profile_self_update();

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
