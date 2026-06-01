# Project Work Summary

Updated: 2026-06-01

## Current Direction

The project will stay local-first for the data phase.

- Collect official NEC/public-data API responses from the local machine.
- Store normalized data and raw API responses in local Docker PostgreSQL.
- Use the Next.js app to inspect candidates, pledges, and later campaign material analysis.
- Avoid AWS/RDS/OCI monthly cost until there is a real need for public operation.
- Revisit deployment only after useful data exists.

## Completed Work

### Repository And App

- Created the Next.js project under `election-report-web/`.
- Connected the repository to GitHub:
  - `https://github.com/Ficstory/local-election-pledge-report.git`
- Added ignored local env handling:
  - real keys stay in `.env.local`
  - placeholders stay in `.env.example`
- Verified the NEC CommonCodeService API key works.
- Confirmed the 2026 local election ID:
  - `NEXT_PUBLIC_DEFAULT_SG_ID=20260603`
- Confirmed relevant NEC election type codes:
  - `3`: 시·도지사선거
  - `4`: 구·시·군의 장선거
  - `11`: 교육감선거

### Local Database Foundation

- Added local PostgreSQL through Docker Compose:
  - file: `election-report-web/docker-compose.yml`
  - exposed port: `localhost:5433`
  - database: `election_report`
- Added Prisma 7:
  - `prisma`
  - `@prisma/client`
  - `@prisma/adapter-pg`
- Added Prisma config:
  - `election-report-web/prisma.config.ts`
- Added Prisma schema:
  - `Election`
  - `ElectionType`
  - `Region`
  - `District`
  - `Party`
  - `Candidate`
  - `Pledge`
  - `FetchRun`
  - `RawApiResponse`
  - `CampaignMaterial`
  - `MaterialDesignAnalysis`
  - `ElectionResult`
- Created and applied initial migration:
  - `election-report-web/prisma/migrations/20260601062111_init/migration.sql`

### API-To-DB Foundation

- Added DB connection check:
  - `npm run db:check`
- Added CommonCodeService ingestion:
  - `npm run db:ingest:common-code`
- The ingestion stores:
  - fetch run metadata
  - raw API response pages
  - normalized elections
  - normalized election types
- Latest successful ingestion result:
  - raw pages: `2`
  - common-code rows: `192`
  - upserted election type records: `150`
  - election types for `20260603`: `8`

## Current Commands

Run from `election-report-web/`.

```powershell
docker compose up -d db
cmd /c npm run db:check
cmd /c npm run db:ingest:common-code
cmd /c npm test
cmd /c npm run lint
cmd /c npm run build
```

## Verified Status

The latest full verification for the DB foundation passed:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run db:check`
- `npx prisma validate`
- `npx prisma migrate status`
- `npm audit --audit-level=moderate`
- `npm run db:ingest:common-code`

## Important Files

- Work plan: `docs/superpowers/plans/2026-06-01-postgres-prisma-collection-foundation.md`
- ERD: `docs/erd/2026-06-01-election-data-erd.md`
- Local-first operation: `docs/operations/2026-06-01-local-first-collection-operation.md`
- Next collection plan: `docs/superpowers/plans/2026-06-01-candidate-pledge-local-ingestion-plan.md`
