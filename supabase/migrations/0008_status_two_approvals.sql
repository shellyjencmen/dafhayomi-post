-- MVP4 per PRD 3.7: content approval and action approval are separate. Only an action approval shows the status on the site.
-- Each approval signs the cards it approved (md5 of the cards JSON), so any change to the cards voids it at once.
begin;

create type approval_stage as enum ('content', 'action');

-- Rows from before this migration were saved by the pilot as approvals that show the status, so they count as action approvals.
alter table approvals add column stage approval_stage not null default 'action';
alter table approvals alter column stage drop default;
alter table approvals add column content_hash text;
alter table approvals add column targets text[] not null default '{}'
  check (targets <@ array['site', 'whatsapp']::text[]);

create function approvals_sign_content() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select md5(a.cards::text) into new.content_hash from alternatives a where a.id = new.alternative_id;
  return new;
end;
$$;
create trigger approvals_sign_content before insert on approvals
  for each row execute function approvals_sign_content();

update approvals ap set content_hash = md5(a.cards::text) from alternatives a where a.id = ap.alternative_id;
alter table approvals alter column content_hash set not null;

-- The pilot SQL could be run twice and left duplicate approvals. Keep the earliest, revoke the rest.
update approvals ap set revoked_at = now()
where ap.revoked_at is null
  and exists (
    select 1 from approvals older
    where older.alternative_id = ap.alternative_id
      and older.post_version_id = ap.post_version_id
      and older.stage = ap.stage
      and older.content_hash = ap.content_hash
      and older.revoked_at is null
      and (older.approved_at, older.id) < (ap.approved_at, ap.id)
  );

-- A double press on "approve" adds nothing: one live approval per alternative, version, stage and content.
create unique index approvals_live_once on approvals (alternative_id, post_version_id, stage, content_hash)
  where revoked_at is null;

-- Readers see an alternative only with a live action approval for the current version of a published post,
-- whose signature still matches the cards.
create or replace function alternative_is_public(alt_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from approvals ap
    join alternatives a on a.id = ap.alternative_id
    join deliverables d on d.id = ap.deliverable_id
    join posts p on p.id = d.post_id
    where ap.alternative_id = alt_id
      and ap.stage = 'action'
      and ap.revoked_at is null
      and ap.content_hash = md5(a.cards::text)
      and ap.post_version_id = p.current_version_id
      and p.publish_state = 'published'
  );
$$;

-- The same signature, readable as a computed column (select "content_hash" on alternatives) so the screens
-- can tell whether an approval still matches the cards.
create function content_hash(alternatives) returns text
language sql stable as $$ select md5($1.cards::text) $$;

commit;
