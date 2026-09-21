insert into storage.buckets (id, name, public)
values ('user-files', 'user-files', false)
on conflict (id) do nothing;

create policy "Users can view their own files"
on storage.objects for select to authenticated
using (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can upload their own files"
on storage.objects for insert to authenticated
with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can delete their own files"
on storage.objects for delete to authenticated
using (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
