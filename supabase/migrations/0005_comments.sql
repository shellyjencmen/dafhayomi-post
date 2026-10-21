-- Reader comments. A comment is shown only after the owner approves it.
-- Readers never write directly: the server inserts with the secret key after validation.
create type comment_status as enum ('pending', 'approved', 'rejected', 'removed');

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 60),
  body text not null check (char_length(body) between 1 and 1000),
  status comment_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index comments_post_idx on comments (post_id, status, created_at);

alter table comments enable row level security;

create policy comments_read_approved on comments for select
  using (
    status = 'approved'
    and exists (select 1 from posts p where p.id = comments.post_id and p.publish_state = 'published')
  );
create policy comments_owner_all on comments for all using (is_owner()) with check (is_owner());
