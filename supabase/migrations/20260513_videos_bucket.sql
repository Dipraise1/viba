-- ─── Videos storage bucket ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('videos', 'videos', true)
  on conflict do nothing;

create policy "Videos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'videos');

create policy "Users can upload their own videos"
  on storage.objects for insert
  with check (bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own videos"
  on storage.objects for update
  using (bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own videos"
  on storage.objects for delete
  using (bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]);
