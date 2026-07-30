-- Extends the existing schema (agreed with project owner) to support:
--   1. Username/email/status display fields on profiles (app has no separate
--      auth-facing username table; email is the real Supabase Auth identity,
--      username is a short display form derived from it at account-creation time).
--   2. An audit_log table backing the admin console's audit trail.
--   3. An additive read policy so every authenticated user can see the
--      single admin-owned "published" engine config row (existing owner-only
--      policy on configs is left untouched; this only adds visibility).
--   4. A last-admin-lockout trigger on profiles.
--
-- Nothing here modifies or removes an existing table, column, or policy.

-- 1. profiles: username / email / status -------------------------------------------------

alter table public.profiles
  add column if not exists username text,
  add column if not exists email text,
  add column if not exists status text not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check check (status in ('active', 'suspended', 'inactive'));

create unique index if not exists profiles_username_key on public.profiles (username) where username is not null;
create unique index if not exists profiles_email_key on public.profiles (email) where email is not null;

-- Keep profiles populated from auth.users metadata set by the create-user Edge Function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, username, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'analyst'),
    new.raw_user_meta_data->>'username',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. audit_log -----------------------------------------------------------------------------

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  action text not null,
  detail text,
  assessment_id uuid references public.assessments(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "insert own audit rows" on public.audit_log;
create policy "insert own audit rows" on public.audit_log
  for insert
  with check (actor_id = auth.uid());

drop policy if exists "admins read audit log" on public.audit_log;
create policy "admins read audit log" on public.audit_log
  for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 3. configs: additive read policy for the admin-owned published engine config -------------

drop policy if exists "read admin configs" on public.configs;
create policy "read admin configs" on public.configs
  for select
  using (
    exists (select 1 from public.profiles p where p.id = configs.user_id and p.role = 'admin')
  );

-- 4. last-admin lockout trigger -------------------------------------------------------------

create or replace function public.prevent_last_admin_lockout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_admins int;
begin
  if tg_op = 'DELETE' then
    if old.role = 'admin' then
      select count(*) into remaining_admins from public.profiles where role = 'admin' and id <> old.id;
      if remaining_admins = 0 then
        raise exception 'Cannot delete this account: it is the last remaining admin.';
      end if;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.role = 'admin' and new.role <> 'admin' then
      select count(*) into remaining_admins from public.profiles where role = 'admin' and id <> old.id;
      if remaining_admins = 0 then
        raise exception 'Cannot change this account''s role: it is the last remaining admin.';
      end if;
    end if;
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_last_admin_lockout_trigger on public.profiles;
create trigger prevent_last_admin_lockout_trigger
  before update or delete on public.profiles
  for each row
  execute function public.prevent_last_admin_lockout();
