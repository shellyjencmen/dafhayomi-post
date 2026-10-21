-- Gemara page images. Readers get the WebP copy from the public bucket (random paths, no listing);
-- the original is kept in a private bucket. Uploads go through the server with the secret key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('gemara', 'gemara', true, 5242880, array['image/webp']),
  ('gemara-originals', 'gemara-originals', false, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Reordering swaps two sort values through a temporary 0, so allow 0. The 12-image limit is enforced by the app.
alter table gemara_pages drop constraint gemara_pages_sort_check;
alter table gemara_pages add constraint gemara_pages_sort_check check (sort between 0 and 99);
