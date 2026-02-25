-- FIX: RLS circular dependency (error 42P17)
-- Run this in Supabase SQL Editor to fix the infinite recursion between projects ↔ project_shares

-- ============================================
-- Step 1: Drop all existing policies
-- ============================================
drop policy if exists "Owners can view own projects" on public.projects;
drop policy if exists "Owners can create projects" on public.projects;
drop policy if exists "Owners can update projects" on public.projects;
drop policy if exists "Owners can delete projects" on public.projects;
drop policy if exists "Shared users can view projects" on public.projects;
drop policy if exists "Shared users can update projects" on public.projects;

drop policy if exists "Users can view items in accessible projects" on public.items;
drop policy if exists "Users can create items in accessible projects" on public.items;
drop policy if exists "Users can update items in accessible projects" on public.items;
drop policy if exists "Users can delete items in own projects" on public.items;
drop policy if exists "Users can delete items in accessible projects" on public.items;

drop policy if exists "Project owners can manage shares" on public.project_shares;
drop policy if exists "Inviters can manage their shares" on public.project_shares;
drop policy if exists "Invited users can view their shares" on public.project_shares;
drop policy if exists "Anyone can view share by token" on public.project_shares;
drop policy if exists "Authenticated users can accept invites" on public.project_shares;

-- ============================================
-- Step 2: Create helper functions (security definer bypasses RLS)
-- ============================================
create or replace function public.user_has_project_access(p_project_id uuid, p_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = p_user_id
  ) or exists (
    select 1 from public.project_shares
    where project_id = p_project_id
    and invited_user_id = p_user_id
    and accepted = true
  );
end;
$$ language plpgsql security definer stable;

create or replace function public.user_has_project_edit_access(p_project_id uuid, p_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = p_user_id
  ) or exists (
    select 1 from public.project_shares
    where project_id = p_project_id
    and invited_user_id = p_user_id
    and accepted = true
    and role = 'edit'
  );
end;
$$ language plpgsql security definer stable;

-- ============================================
-- Step 3: Recreate project policies (no circular refs)
-- ============================================
create policy "Owners can view own projects" on public.projects
  for select using (auth.uid() = owner_id);

create policy "Owners can create projects" on public.projects
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own projects" on public.projects
  for update using (auth.uid() = owner_id);

create policy "Owners can delete projects" on public.projects
  for delete using (auth.uid() = owner_id);

create policy "Shared users can view projects" on public.projects
  for select using (
    id in (
      select project_id from public.project_shares
      where invited_user_id = auth.uid()
      and accepted = true
    )
  );

create policy "Shared users can update projects" on public.projects
  for update using (
    id in (
      select project_id from public.project_shares
      where invited_user_id = auth.uid()
      and accepted = true
      and role = 'edit'
    )
  );

-- ============================================
-- Step 4: Recreate item policies (use security definer functions)
-- ============================================
create policy "Users can view items in accessible projects" on public.items
  for select using (public.user_has_project_access(project_id, auth.uid()));

create policy "Users can create items in accessible projects" on public.items
  for insert with check (public.user_has_project_edit_access(project_id, auth.uid()));

create policy "Users can update items in accessible projects" on public.items
  for update using (public.user_has_project_edit_access(project_id, auth.uid()));

create policy "Users can delete items in accessible projects" on public.items
  for delete using (public.user_has_project_edit_access(project_id, auth.uid()));

-- ============================================
-- Step 5: Recreate share policies (use direct column, no project subquery)
-- ============================================
create policy "Inviters can manage their shares" on public.project_shares
  for all using (invited_by = auth.uid());

create policy "Invited users can view their shares" on public.project_shares
  for select using (invited_user_id = auth.uid());

create policy "Anyone can view share by token" on public.project_shares
  for select using (true);

create policy "Authenticated users can accept invites" on public.project_shares
  for update using (auth.uid() is not null)
  with check (auth.uid() is not null);
