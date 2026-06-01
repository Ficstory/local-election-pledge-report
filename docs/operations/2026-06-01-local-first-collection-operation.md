# Local-First Collection Operation

Updated: 2026-06-01

## Decision

Use local collection and local PostgreSQL for now.

This is the cheapest and most practical setup for the current phase because the project is still focused on collecting, cleaning, inspecting, and analyzing official election data. Cloud hosting can wait until the data model and report output become stable.

## Local Architecture

```text
Local PC
├─ Next.js app
├─ Docker PostgreSQL
├─ Prisma migrations
├─ NEC API collection scripts
├─ campaign material download directory
└─ report/export scripts
```

## Daily Start

Run from `election-report-web/`.

```powershell
docker compose up -d db
cmd /c npm run db:check
cmd /c npm run dev
```

## Data Collection

Common code ingestion already exists:

```powershell
cmd /c npm run db:ingest:common-code
```

Candidate, pledge, and campaign-material ingestion will follow the same pattern:

1. Fetch official API response.
2. Save the full response into `RawApiResponse`.
3. Normalize rows into domain tables.
4. Use upsert logic to avoid duplicate inserts.
5. Keep request metadata and fetch status in `FetchRun`.

## Backup

Take a backup before large re-ingestion runs.

```powershell
docker compose exec db pg_dump -U election_report election_report > backup.sql
```

Keep at least one backup outside the project folder. Good enough options for now:

- external drive
- private cloud drive
- encrypted archive

## What Not To Do Yet

- Do not pay for AWS RDS while the data model is still moving.
- Do not expose local PostgreSQL to the public internet.
- Do not store campaign PDFs/images directly in PostgreSQL.
- Do not commit `.env`, `.env.local`, API keys, or DB passwords.

## Later Deployment Options

### Static Report Deployment

If the output is mostly a report/dashboard snapshot:

- Export DB data to JSON/CSV.
- Build static pages from exported data.
- Deploy the static site to Vercel, Cloudflare Pages, or GitHub Pages.

This has the lowest operating cost.

### Full Web Service Deployment

If live filtering/search/login/API access is needed:

- Move Docker PostgreSQL and the app to OCI/AWS/Lightsail.
- Or keep the app on Vercel and put API/DB on a VM.
- Add scheduled backups and database access controls.

This should wait until the local pipeline proves useful.
