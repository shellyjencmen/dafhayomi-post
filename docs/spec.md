# Technical spec
Requirements, acceptance criteria, data model. Source: PRD and solution concept.
Full solution concept: docs/solution.md. MVP1 scope: public site, post management with versions, usage reports, plus two seams (stable post and version id, post retrieval for agents). The Issue list for MVP1 is tracked in GitHub Issues.

## Comments (MVP1, decided 21.10.2026)
- Readers can comment on a published post with a name (1-60 characters) and text (1-1000 characters). No login.
- A comment is saved as `pending` and is shown to readers only after the owner approves it (`approved`). The owner can also reject (`rejected`) or remove (`removed`) a comment. This keeps the rule that nothing is published without Avi's approval.
- Comments belong to the post, not to a version: approving a comment does not depend on `post_version_id`, and republishing does not change comments.
- Spam protection without personal data: a hidden field that bots fill, length limits, and a cap of 50 pending comments per post. No cookies and no identifiers are stored.
- Owners: Avi, and Shelly as the vendor. The usage report shows published and pending comment counts.
- Data: table `comments` (migration 0005). Readers can select only `approved` comments of published posts; inserts happen on the server with the secret key.
