# User Actions: OCI PostgreSQL Operation

Updated: 2026-06-01

## Right Now

- Keep the real `DATA_GO_KR_SERVICE_KEY` only in `election-report-web/.env.local`.
- Install Docker Desktop locally if `docker compose` is not available.
- Use local PostgreSQL first:
  - `cd election-report-web`
  - `docker compose up -d db`
  - `npm run db:check`
  - `npm run db:ingest:common-code`

## Before Moving To OCI

- Create one OCI Compute VM with Ubuntu 22.04 or 24.04.
- Add a non-root deploy user.
- Install Docker Engine and Docker Compose plugin on the VM.
- Keep SSH open only to your own IP where possible.
- Do not expose PostgreSQL port `5432` directly to the public internet.
- Run the Next.js app and PostgreSQL on the same private VM network, or access PostgreSQL through an SSH tunnel.

## OCI Environment Values To Prepare

Use strong production values instead of local defaults.

```env
POSTGRES_USER=election_report
POSTGRES_PASSWORD=<strong-production-password>
POSTGRES_DB=election_report
POSTGRES_PORT=5432
DATABASE_URL=postgresql://election_report:<strong-production-password>@localhost:5432/election_report?schema=public
DATA_GO_KR_SERVICE_KEY=<public-data-portal-service-key>
NEXT_PUBLIC_DEFAULT_SG_ID=20260603
```

## Backup Rule

- Take PostgreSQL backups before large re-ingestion runs.
- Minimum command shape:
  - `docker compose exec db pg_dump -U election_report election_report > backup.sql`
- Store backups outside the VM as well, for example OCI Object Storage or a local encrypted copy.

## Operational Risks

- Public DB exposure: avoid opening `5432` in OCI security lists.
- API key leakage: never commit `.env.local`, shell history exports, or screenshots showing the key.
- API schema drift: always preserve `RawApiResponse` so changed NEC payloads can be reprocessed.
- Duplicate ingestion: scripts should use upserts and request hashes, not blind inserts.
- Storage growth: campaign PDFs/images can grow quickly; keep them outside PostgreSQL and store only metadata/path/hash in DB.
