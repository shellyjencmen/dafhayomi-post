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

## Deliverables and approvals (MVP4, migrations 0006 to 0008; PRD v0.6 section 3.7)
- A deliverable (status now; email and short post later) belongs to a post and to one `post_version_id`. A status has exactly two alternatives (`a` follows the post's order, `b` opens with the conclusion), each with 3 to 6 cards.
- A card is `{ phase, title, text, options }`: phase is opening, middle or closing; `options` are other suggested wordings. The owner fixes a card only by picking a suggested wording, moving it or deleting it. No free typing.
- Cards summarize the idea; they are not word-for-word quotes. The POC prepares them by simple rules (free). A language model (Claude API) is an option behind the same interface, off by default (`STATUS_METHOD`).
- Two approvals, both by an owner: **content** approval, then **action** approval (show on the site). Content approval alone shows and shares nothing.
- Every approval stores the `post_version_id`, the alternative, the owner, the time, the targets and a signature of the cards it approved (`content_hash`, md5 of the cards JSON). It is valid only while it is not revoked, its version is the post's current version, and the signature matches the cards. So a new post version or any change to the cards voids it at once, and the site hides the status until a new action approval. "Needs review" is derived, not stored.
- A double press on "approve" adds nothing (one live approval per alternative, version, stage and signature).
- Readers can read an alternative only with a valid action approval for the current version of a published post. Drafts, alternatives, content approvals, approvals and shares are visible to owners only.
- State per target: site = shown while a valid action approval exists; WhatsApp = "shared" mark, one row per deliverable, so a second press adds nothing. What was already shared stays shared after a change; the owner decides whether to share again.
