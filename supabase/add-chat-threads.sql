-- Life OS: Add Chat Threads
-- Run this in Supabase SQL Editor

-- ============================================
-- CHAT THREADS
-- ============================================
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.chat_threads enable row level security;

create policy "Users can view own threads" on public.chat_threads
  for select using (user_id = auth.uid());

create policy "Users can create own threads" on public.chat_threads
  for insert with check (user_id = auth.uid());

create policy "Users can update own threads" on public.chat_threads
  for update using (user_id = auth.uid());

create policy "Users can delete own threads" on public.chat_threads
  for delete using (user_id = auth.uid());

-- Add thread_id to chat_messages
alter table public.chat_messages add column thread_id uuid references public.chat_threads(id) on delete cascade;

-- Index
create index idx_chat_threads_user on public.chat_threads(user_id);
create index idx_chat_threads_project on public.chat_threads(project_id);
create index idx_chat_threads_updated on public.chat_threads(updated_at desc);
create index idx_chat_messages_thread on public.chat_messages(thread_id);

-- Updated_at trigger
create trigger chat_threads_updated_at
  before update on public.chat_threads
  for each row execute function public.update_updated_at();
