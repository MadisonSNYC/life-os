-- Life OS: Add Chat Feature
-- Run this in Supabase SQL Editor after the initial schema

-- ============================================
-- CHAT MESSAGES
-- ============================================
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now() not null
);

-- metadata can store:
-- { "created_items": ["uuid", ...], "created_project": "uuid", "action_type": "task_creation" | "research" | "planning" }

alter table public.chat_messages enable row level security;

-- Users can view their own messages
create policy "Users can view own messages" on public.chat_messages
  for select using (user_id = auth.uid());

-- Users can insert their own messages
create policy "Users can insert own messages" on public.chat_messages
  for insert with check (user_id = auth.uid());

-- Also allow the system to insert assistant messages for the user
-- (the API route runs as the user's session)

-- ============================================
-- PLANNING PAGES (rich detail views created by AI)
-- ============================================
create table public.planning_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null default '',
  content_type text default 'markdown' check (content_type in ('markdown', 'html')),
  metadata jsonb default '{}',
  position int default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.planning_pages enable row level security;

-- Use the existing helper functions for project-level access
create policy "Users can view planning pages in accessible projects" on public.planning_pages
  for select using (public.user_has_project_access(project_id, auth.uid()));

create policy "Users can create planning pages in editable projects" on public.planning_pages
  for insert with check (public.user_has_project_edit_access(project_id, auth.uid()));

create policy "Users can update planning pages in editable projects" on public.planning_pages
  for update using (public.user_has_project_edit_access(project_id, auth.uid()));

create policy "Users can delete planning pages in editable projects" on public.planning_pages
  for delete using (public.user_has_project_edit_access(project_id, auth.uid()));

-- ============================================
-- INDEXES
-- ============================================
create index idx_chat_messages_user on public.chat_messages(user_id);
create index idx_chat_messages_project on public.chat_messages(project_id);
create index idx_chat_messages_created on public.chat_messages(created_at);
create index idx_planning_pages_project on public.planning_pages(project_id);

-- Updated_at trigger for planning pages
create trigger planning_pages_updated_at
  before update on public.planning_pages
  for each row execute function public.update_updated_at();
