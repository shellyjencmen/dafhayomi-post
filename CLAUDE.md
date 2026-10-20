# CLAUDE.md
## What this system does
Weekly Daf Yomi post site for Avi Yunitzman: public site for the post and Gemara pages, post management with versions, usage reports; later agents (email draft, status, short post), approvals and monitoring. Chosen alternative: single Next.js app on Vercel with Supabase (Postgres, Storage, Auth). WhatsApp sharing stays manual. Details: docs/spec.md, docs/solution.md, docs/runbook/RUNBOOK.md.
## Structure
- src/app: pages and API routes (api/health for monitoring)
- docs: spec, solution concept, runbook (RUNBOOK.md, STATE.md)
- .github: CI, issue and PR templates, Dependabot
## Commands
- install: npm install
- run locally: npm run dev
- test: npm run lint && npm run build
- deploy: merge to main (Vercel production)
## Rules
- Work on a branch and open a Pull Request. Never commit directly to main.
- Each change starts from an Issue with acceptance criteria.
- Secrets live only in environment variables. Never in code or chat. Names only in .env.example.
- UI is Hebrew, RTL, mobile first.
- Three environments with separate databases: local, preview, production. No real data outside production.
- A post is identified by id and slug, never by date. Approval is valid only for the current post_version_id (see docs/solution.md 6.4).
- Do not change: the approval and versioning rules above without updating docs/spec.md.
