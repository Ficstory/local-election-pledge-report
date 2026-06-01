# Project Work Summary

Updated: 2026-06-02

## Current Direction

The project will stay local-first for the data phase.

- Collect official NEC/public-data API responses from the local machine.
- Store normalized data and raw API responses in local Docker PostgreSQL.
- Use the Next.js app to inspect candidates, pledges, and later campaign material analysis.
- Avoid AWS/RDS/OCI monthly cost until there is a real need for public operation.
- Revisit deployment only after useful data exists.

## Work Sequence Snapshot

1. Project direction: chose local-first data collection before cloud deployment.
2. App foundation: created the Next.js app under `election-report-web/`.
3. DB foundation: added Docker PostgreSQL, Prisma, schema, migration, and DB health check.
4. Common code ingestion: collected official election and election-type codes.
5. Candidate API reconnaissance: confirmed candidate endpoint and stable key `huboid`.
6. Candidate ingestion: parsed and stored `697` official candidates.
7. Candidate career persistence: added `career1` and `career2`, then re-ingested candidates.
8. Pledge API reconnaissance: confirmed candidate-level pledge endpoint and slot fields.
9. Pledge ingestion: parsed and stored `3,345` official pledge records.
10. DB-backed web UI: switched dashboard/detail pages from mock data to PostgreSQL.
11. Web inspection controls: added search, filters, pagination, pledge disclosure, and career display.
12. Verification and Git: passed tests/lint/build/local HTTP checks, then pushed to `origin/main`.

## Next Work

The next immediate work is campaign material collection.

- Start with API reconnaissance for official campaign material metadata/files.
- Do not write DB rows during the first reconnaissance step.
- Confirm whether the existing `DATA_GO_KR_SERVICE_KEY` has access.
- Confirm whether the API returns direct PDF/image URLs or another lookup shape.
- Add schema changes only after the endpoint shape is confirmed.

Detailed roadmap:

- `docs/roadmap/2026-06-02-next-work-roadmap.md`

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

### Candidate Ingestion

- Added candidate API reconnaissance:
  - `npm run inspect:candidate-api`
- Confirmed candidate endpoint:
  - `getPofelcddRegistSttusInfoInqire`
- Confirmed stable candidate key:
  - `huboid`
- Added candidate parser:
  - `election-report-web/src/lib/nec-candidate.ts`
  - `election-report-web/src/lib/nec-candidate.test.ts`
- Added candidate DB ingestion:
  - `npm run db:ingest:candidates`
- Latest successful candidate ingestion result:
  - raw pages: `8`
  - total candidates: `697`
  - `sgTypecode=3`: `54`
  - `sgTypecode=4`: `585`
  - `sgTypecode=11`: `58`
  - skipped candidates without stable key: `0`
- Added official candidate career persistence:
  - Prisma `Candidate.career1` and `Candidate.career2`
  - candidate parser and DB ingestion preserve `career1`/`career2`
  - latest re-ingestion upserted `697` candidates
  - candidates with at least one career field: `697`

### Pledge API Reconnaissance

- Added pledge API reconnaissance:
  - `npm run inspect:pledge-api`
- Confirmed pledge endpoint from the official public-data documentation:
  - `getCnddtElecPrmsInfoInqire`
- Confirmed lookup shape:
  - candidate-level lookup using `sgId`, `sgTypecode`, and `cnddtId`
- Latest successful pledge API reconnaissance:
  - `sgTypecode=3`: `200`, `INFO-00`, total count `1`
  - `sgTypecode=4`: `200`, `INFO-00`, total count `1`
  - `sgTypecode=11`: `200`, `INFO-00`, total count `1`
- Confirmed pledge payload shape:
  - one candidate-level row contains up to 10 pledge slots
  - order fields: `prmsOrd1` through `prmsOrd10`
  - category fields: `prmsRealmName1` through `prmsRealmName10`
  - title fields: `prmsTitle1` through `prmsTitle10`
  - content fields: `prmmCont1` through `prmmCont10`
- Added pledge parser:
  - `election-report-web/src/lib/nec-pledge.ts`
  - `election-report-web/src/lib/nec-pledge.test.ts`
- Parser output:
  - expands one candidate-level row into multiple pledge records
  - preserves full pledge content in `details.content`
  - keeps readable `title`, `summary`, `category`, and `priority`
- Added pledge DB ingestion:
  - `npm run db:ingest:pledges`
- Latest successful pledge ingestion result:
  - processed candidates: `697`
  - raw pledge pages: `697`
  - total pledges: `3345`
  - `sgTypecode=3`: `260`
  - `sgTypecode=4`: `2795`
  - `sgTypecode=11`: `290`
- Current DB counts:
  - elections: `42`
  - election types for `20260603`: `8`
  - candidates: `697`
  - pledges: `3345`
  - raw responses by source:
    - `NEC_COMMON_CODE`: `2`
    - `NEC_CANDIDATE`: `16`
    - `NEC_PLEDGE`: `697`

### DB-Backed Web UI

- Switched the Next.js dashboard from mock data to local PostgreSQL.
- Added DB query/mapping layer:
  - `election-report-web/src/lib/election-db.ts`
- Updated dashboard:
  - reads candidates and pledges from PostgreSQL
  - shows `DB` data mode
  - displays `697` candidates and `3,345` pledge records from the local DB
- Updated candidate detail pages:
  - dynamic DB-backed route: `/candidates/[id]`
  - shows official candidate API ID and pledge content from PostgreSQL
  - shows official candidate career fields when present
- Added DB-backed list controls:
  - candidate/name/party/region search
  - election type filter
  - region filter
  - party filter
  - server query pagination with 50 candidates per page
- Improved pledge readability:
  - candidate detail pages show pledge content behind a `공약 원문 보기` disclosure
- Verified local rendering:
  - `/`: HTTP `200`, contains DB counts `697` and `3,345`
  - `/?q=허태정`: HTTP `200`, contains candidate `허태정`
  - `/?office=governor`: HTTP `200`, contains `시·도지사`
  - `/?page=2`: HTTP `200`
  - `/candidates/cmpvk28i8002d74cxwkjrtmfp`: HTTP `200`, contains candidate `허태정`, API ID `100153736`, and pledge title `민생경제 회복`
  - `/candidates/cmpvk2891000d74cxw5hemjsc`: HTTP `200`, contains rendered `career-list` and pledge `<details>`

## Current Commands

Run from `election-report-web/`.

```powershell
docker compose up -d db
cmd /c npm run db:check
cmd /c npm run db:ingest:common-code
cmd /c npm run inspect:candidate-api
cmd /c npm run db:ingest:candidates
cmd /c npm run inspect:pledge-api
cmd /c npm run db:ingest:pledges
cmd /c npm test
cmd /c npm run lint
cmd /c npm run build
cmd /c npm run dev -- -p 3000
```

## Verified Status

The latest full verification for the DB foundation passed:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run db:check`
- `npx prisma validate`
- `npx prisma migrate deploy`
- `npm audit --audit-level=moderate`
- `npm run db:ingest:common-code`
- `npm run db:ingest:candidates`
- `npm run db:ingest:pledges`
- DB check: `697` of `697` candidates have official career fields populated
- `npm test -- src/lib/nec-pledge.test.ts`
- local HTTP check for `/`
- local HTTP check for `/candidates/[id]`

## Important Files

- Work plan: `docs/superpowers/plans/2026-06-01-postgres-prisma-collection-foundation.md`
- ERD: `docs/erd/2026-06-01-election-data-erd.md`
- Local-first operation: `docs/operations/2026-06-01-local-first-collection-operation.md`
- Next collection plan: `docs/superpowers/plans/2026-06-01-candidate-pledge-local-ingestion-plan.md`
- Detailed next roadmap: `docs/roadmap/2026-06-02-next-work-roadmap.md`
