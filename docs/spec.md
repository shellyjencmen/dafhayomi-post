# Technical spec
Requirements, acceptance criteria, data model. Source: PRD and solution concept.
Full solution concept: docs/solution.md. MVP1 scope: public site, post management with versions, usage reports, plus two seams (stable post and version id, post retrieval for agents). The Issue list for MVP1 is tracked in GitHub Issues.

## Comments (MVP1, decided 21.10.2026; publishing changed 24.10.2026)
- Readers can comment on a published post with a name (1-60 characters) and text (1-1000 characters). No login.
- Changed 24.10.2026 (Shelly): a comment is published at once (saved as `approved`), with no approval by Avi. The owner can remove it (`removed`). Status `pending` and `rejected` stay in the data model; comments saved as `pending` before the change still appear in the admin page for approval. The approval rule for posts is not affected.
- Comments belong to the post, not to a version: approving a comment does not depend on `post_version_id`, and republishing does not change comments.
- Spam protection without personal data: a hidden field that bots fill, length limits, and a cap of 200 comments per post. No cookies and no identifiers are stored.
- Owners: Avi, and Shelly as the vendor. The usage report shows published and pending comment counts.
- Data: table `comments` (migration 0005). Readers can select only `approved` comments of published posts; inserts happen on the server with the secret key.

## Deliverables and approvals (MVP4 data model, migration 0006)
- A deliverable (status now; email and short post later) belongs to a post and to one `post_version_id`. A status has exactly two alternatives (`a`, `b`), each a list of cards taken from the post.
- An approval is saved with the `post_version_id` it was given for. It is valid only while it is not revoked and that id equals the post's current version. Nothing is stored as "needs review": it is derived, so a new version of the post makes every earlier approval invalid at once (rules 3 and 4 in docs/solution.md 6.4).
- Editing a card after approval revokes the approval (`revoked_at`). History stays.
- Readers can read an alternative only when it has a valid approval for the current version of a published post. Drafts, unapproved alternatives, approvals and shares are visible to owners only.
- "Shared" is one row per deliverable, so a second press adds nothing.
