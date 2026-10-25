-- MVP4 data model: deliverables derived from a post version, their alternatives, approvals and shares.
-- Reused later by email (MVP2), monitoring (MVP3) and short post (MVP5).
-- "Needs review" is derived, not stored: a deliverable or approval is current only while its
-- post_version_id equals posts.current_version_id (docs/solution.md 6.4, rules 3 and 4).
create type deliverable_kind as enum ('status', 'email', 'short_post');

create table deliverables (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  post_version_id uuid not null references post_versions (id) on delete cascade,
  kind deliverable_kind not null,
  created_at timestamptz not null default now(),
  unique (post_id, post_version_id, kind)
);
create index deliverables_post_idx on deliverables (post_id, kind);

-- Two alternatives per deliverable. cards is a JSON array of strings (text taken from the post).
create table alternatives (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references deliverables (id) on delete cascade,
  label text not null check (label in ('a', 'b')),
  cards jsonb not null check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) between 1 and 12),
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deliverable_id, label)
);

-- An approval is valid only while revoked_at is null and post_version_id is the current version.
create table approvals (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references deliverables (id) on delete cascade,
  alternative_id uuid not null references alternatives (id) on delete cascade,
  post_version_id uuid not null references post_versions (id) on delete cascade,
  action text not null check (char_length(action) between 1 and 100),
  approved_by uuid references auth.users (id),
  approved_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index approvals_deliverable_idx on approvals (deliverable_id, approved_at);

-- Manual sharing mark ("shared"). One row per deliverable, so a second press adds nothing.
create table shares (
  deliverable_id uuid primary key references deliverables (id) on delete cascade,
  shared_at timestamptz not null default now(),
  shared_by uuid references auth.users (id)
);

-- Readers may see an alternative only when it has a valid approval for the current version of a published post.
create function alternative_is_public(alt_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from approvals ap
    join deliverables d on d.id = ap.deliverable_id
    join posts p on p.id = d.post_id
    where ap.alternative_id = alt_id
      and ap.revoked_at is null
      and ap.post_version_id = p.current_version_id
      and p.publish_state = 'published'
  );
$$;

alter table deliverables enable row level security;
alter table alternatives enable row level security;
alter table approvals enable row level security;
alter table shares enable row level security;

create policy deliverables_owner_all on deliverables for all using (is_owner()) with check (is_owner());
create policy alternatives_owner_all on alternatives for all using (is_owner()) with check (is_owner());
create policy alternatives_read_approved on alternatives for select using (alternative_is_public(id));
create policy approvals_owner_all on approvals for all using (is_owner()) with check (is_owner());
create policy shares_owner_all on shares for all using (is_owner()) with check (is_owner());
-- Readers have no policy on deliverables, approvals or shares.
