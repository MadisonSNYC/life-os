-- Life OS: Add Storage for Chat Attachments
-- Run this in Supabase SQL Editor

-- Create storage bucket for chat attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760, -- 10MB max
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies
create policy "Authenticated users can upload" on storage.objects
  for insert with check (
    bucket_id = 'chat-attachments'
    and auth.uid() is not null
  );

create policy "Anyone can view chat attachments" on storage.objects
  for select using (bucket_id = 'chat-attachments');

create policy "Users can delete own uploads" on storage.objects
  for delete using (
    bucket_id = 'chat-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
