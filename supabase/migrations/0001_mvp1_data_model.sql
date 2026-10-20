-- MVP1 data model (docs/solution.md 6.4). Outputs, approvals and deliveries arrive with MVP2-5.

create type publish_state as enum ('draft', 'published', 'unpublished');
create type user_role as enum ('owner', 'reader');

create table masechtot (
  id int primary key generated always as identity,
  name text not null unique,
  sort_order int not null unique
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  masechet_id int references masechtot (id),
  daf int,
  published_on date,
  publish_state publish_state not null default 'draft',
  current_version_id uuid,
  updated_at timestamptz not null default now()
);

create table post_versions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  version_no int not null,
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) <= 60000),
  summary text check (char_length(summary) <= 500),
  created_at timestamptz not null default now(),
  unique (post_id, version_no)
);

alter table posts
  add constraint posts_current_version_fk
  foreign key (current_version_id) references post_versions (id);

create table gemara_pages (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  sort int not null check (sort between 1 and 12),
  label text,
  alt_text text,
  image_path text not null,
  original_path text,
  unique (post_id, sort)
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'reader',
  display_name text
);

-- Aggregate counts only: no cookies, no identifiers.
create table page_views (
  id bigint primary key generated always as identity,
  post_id uuid not null references posts (id) on delete cascade,
  channel text not null default 'direct',
  viewed_at timestamptz not null default now()
);
create index page_views_post_idx on page_views (post_id, channel);

create function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

alter table masechtot enable row level security;
alter table posts enable row level security;
alter table post_versions enable row level security;
alter table gemara_pages enable row level security;
alter table profiles enable row level security;
alter table page_views enable row level security;

create policy masechtot_read on masechtot for select using (true);
create policy masechtot_owner_write on masechtot for all using (is_owner()) with check (is_owner());

create policy posts_read on posts for select
  using (publish_state = 'published' or is_owner());
create policy posts_owner_write on posts for all using (is_owner()) with check (is_owner());

-- Readers see only the current version of a published post.
create policy post_versions_read on post_versions for select
  using (
    is_owner()
    or exists (
      select 1 from posts p
      where p.id = post_versions.post_id
        and p.publish_state = 'published'
        and p.current_version_id = post_versions.id
    )
  );
create policy post_versions_owner_write on post_versions for all using (is_owner()) with check (is_owner());

create policy gemara_pages_read on gemara_pages for select
  using (
    is_owner()
    or exists (select 1 from posts p where p.id = gemara_pages.post_id and p.publish_state = 'published')
  );
create policy gemara_pages_owner_write on gemara_pages for all using (is_owner()) with check (is_owner());

create policy profiles_read_own on profiles for select using (id = auth.uid() or is_owner());

-- page_views: no policies. Inserts and reads go through the server with the secret key.
