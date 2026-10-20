# Daily Page post (Avi Yunitzman)
## Install and run
    npm install
    cp .env.example .env.local   # fill values locally, never commit
    npm run dev
Check: `npm run lint && npm run build`.
## Environments (preview / production) and where they are hosted
- Local: Supabase local.
- Preview: Vercel preview per PR, with the second Supabase project.
- Production: Vercel (main), first Supabase project.
Addresses: see docs/runbook/RUNBOOK.md.
## Runbook: what to do when something breaks
See docs/runbook/RUNBOOK.md (incidents.md will be added before go-live). Health check: /api/health.
## Who owns what (repo, hosting, database, domain)
Repo, Vercel, Supabase, Claude API: Shelly Jencmen (vendor). Domain: not decided.
