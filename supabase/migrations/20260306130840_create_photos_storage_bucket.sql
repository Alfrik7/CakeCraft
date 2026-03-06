insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view photos" on storage.objects;
create policy "Public can view photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'photos');

drop policy if exists "Public can upload photos to allowed folders" on storage.objects;
create policy "Public can upload photos to allowed folders"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] in ('menu', 'references', 'gallery')
  and lower(coalesce(metadata ->> 'mimetype', '')) in ('image/jpeg', 'image/png', 'image/webp')
  and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
);
