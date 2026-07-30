-- Bug fix, not a design change: the pre-existing admin-bypass policies (on
-- profiles, assessments, documents) each checked admin-ness with an inline
-- subquery against profiles from within a policy defined ON profiles:
--
--   exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
--
-- Evaluating that subquery re-triggers profiles' own RLS, which re-evaluates
-- the same policy, which re-triggers RLS again — Postgres detects this and
-- raises "infinite recursion detected in policy for relation profiles" the
-- moment anything actually exercises the admin-bypass path (confirmed live
-- while verifying admin-read-all-assessments and admin-read-all-profiles).
--
-- Standard fix: move the admin check into a SECURITY DEFINER function. Since
-- it runs with the function owner's privileges, its internal profiles lookup
-- bypasses RLS entirely instead of re-entering it, breaking the cycle. This
-- changes no access-control outcome — every policy below grants exactly the
-- same rows to exactly the same callers as before, just without recursing.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Same fix, parameterized: "read admin configs" below checks whether some
-- *other* row's owner (configs.user_id) is an admin, not the caller. Without
-- SECURITY DEFINER that inner profiles lookup is itself RLS-gated to "your
-- own row only", so a non-admin analyst's check would silently always
-- evaluate to false — the published-config-visible-to-everyone feature would
-- never actually work, just quietly instead of loudly like the recursion did.
create or replace function public.user_is_admin(check_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = check_id and role = 'admin');
$$;

drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles" on public.profiles
  for select
  using (public.is_admin());

drop policy if exists "assessments access" on public.assessments;
create policy "assessments access" on public.assessments
  for select
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "assessments delete" on public.assessments;
create policy "assessments delete" on public.assessments
  for delete
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "assessments update" on public.assessments;
create policy "assessments update" on public.assessments
  for update
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "documents access" on public.documents;
create policy "documents access" on public.documents
  for all
  using (
    exists (
      select 1 from public.assessments a
      where a.id = documents.assessment_id and (a.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "read admin configs" on public.configs;
create policy "read admin configs" on public.configs
  for select
  using (public.user_is_admin(configs.user_id));
