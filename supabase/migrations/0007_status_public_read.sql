-- Readers may see the deliverable row of an approved status, so the post page can load it with its alternative.
-- The alternative itself stays hidden unless alternative_is_public() is true (current version, not revoked, published post).
create policy deliverables_read_public on deliverables for select
  using (
    exists (
      select 1 from alternatives a
      where a.deliverable_id = deliverables.id and alternative_is_public(a.id)
    )
  );
