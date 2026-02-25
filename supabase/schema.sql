-- Life OS Database Schema
-- Run this in the Supabase SQL Editor to set up your database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- SPACES
-- ============================================
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  emoji text default '📁',
  color text default '#6366f1',
  position int default 0,
  created_at timestamptz default now() not null
);

alter table public.spaces enable row level security;

create policy "Users can view own spaces" on public.spaces
  for select using (auth.uid() = owner_id);

create policy "Users can create own spaces" on public.spaces
  for insert with check (auth.uid() = owner_id);

create policy "Users can update own spaces" on public.spaces
  for update using (auth.uid() = owner_id);

create policy "Users can delete own spaces" on public.spaces
  for delete using (auth.uid() = owner_id);

-- ============================================
-- PROJECTS
-- ============================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  emoji text default '📋',
  type text default 'standard' check (type in ('standard', 'grocery', 'workout', 'recipe', 'planning')),
  position int default 0,
  created_at timestamptz default now() not null
);

alter table public.projects enable row level security;

-- Simple owner-only policies (no circular references)
create policy "Owners can view own projects" on public.projects
  for select using (auth.uid() = owner_id);

create policy "Owners can create projects" on public.projects
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own projects" on public.projects
  for update using (auth.uid() = owner_id);

create policy "Owners can delete projects" on public.projects
  for delete using (auth.uid() = owner_id);

-- Shared users can view projects shared with them
create policy "Shared users can view projects" on public.projects
  for select using (
    id in (
      select project_id from public.project_shares
      where invited_user_id = auth.uid()
      and accepted = true
    )
  );

-- Shared users with edit role can update projects
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
-- ITEMS
-- ============================================
create table public.items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  notes text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text default 'none' check (priority in ('none', 'low', 'medium', 'high', 'urgent')),
  due_date date,
  due_time time,
  is_recurring boolean default false,
  recurrence_rule text,
  tags text[] default '{}',
  position int default 0,
  metadata jsonb default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  completed_at timestamptz
);

alter table public.items enable row level security;

-- Helper function to check project access (avoids circular RLS)
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

-- Items use security definer functions to avoid RLS recursion
create policy "Users can view items in accessible projects" on public.items
  for select using (public.user_has_project_access(project_id, auth.uid()));

create policy "Users can create items in accessible projects" on public.items
  for insert with check (public.user_has_project_edit_access(project_id, auth.uid()));

create policy "Users can update items in accessible projects" on public.items
  for update using (public.user_has_project_edit_access(project_id, auth.uid()));

create policy "Users can delete items in accessible projects" on public.items
  for delete using (public.user_has_project_edit_access(project_id, auth.uid()));

-- ============================================
-- PROJECT SHARES
-- ============================================
create table public.project_shares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid references public.profiles(id) on delete cascade,
  role text default 'view' check (role in ('view', 'edit')),
  invite_token text unique not null default encode(gen_random_bytes(32), 'hex'),
  accepted boolean default false,
  created_at timestamptz default now() not null
);

alter table public.project_shares enable row level security;

-- Use invited_by column directly (no subquery into projects, avoids recursion)
create policy "Inviters can manage their shares" on public.project_shares
  for all using (invited_by = auth.uid());

create policy "Invited users can view their shares" on public.project_shares
  for select using (invited_user_id = auth.uid());

-- Allow anyone to read a share by token (needed for invite acceptance)
create policy "Anyone can view share by token" on public.project_shares
  for select using (true);

-- Allow authenticated users to update shares (to accept invites)
create policy "Authenticated users can accept invites" on public.project_shares
  for update using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ============================================
-- INDEXES
-- ============================================
create index idx_spaces_owner on public.spaces(owner_id);
create index idx_projects_space on public.projects(space_id);
create index idx_projects_owner on public.projects(owner_id);
create index idx_items_project on public.items(project_id);
create index idx_items_due_date on public.items(due_date);
create index idx_items_status on public.items(status);
create index idx_project_shares_token on public.project_shares(invite_token);
create index idx_project_shares_invited on public.project_shares(invited_user_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_updated_at
  before update on public.items
  for each row execute function public.update_updated_at();

-- ============================================
-- SEED DEFAULT SPACES FUNCTION
-- Called after user creates account
-- ============================================
create or replace function public.seed_default_spaces(user_id uuid)
returns void as $$
begin
  insert into public.spaces (owner_id, name, emoji, color, position) values
    (user_id, 'Personal', '🏠', '#6366f1', 0),
    (user_id, 'Work', '💼', '#0ea5e9', 1),
    (user_id, 'Home', '🏡', '#10b981', 2),
    (user_id, 'Health', '💪', '#f43f5e', 3),
    (user_id, 'Social', '🎉', '#f59e0b', 4);
end;
$$ language plpgsql security definer;
