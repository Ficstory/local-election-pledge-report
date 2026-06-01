# PostgreSQL Prisma Collection Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local PostgreSQL, Prisma schema, migration, DB health check, and first API-to-DB storage path for NEC election data.

**Architecture:** Run PostgreSQL locally with Docker Compose using the same shape that can later move to an OCI Ubuntu VM. Keep API collection scripts in `election-report-web/scripts/`, reusable parsing/mapping logic in `election-report-web/src/lib/`, and canonical schema in `election-report-web/prisma/schema.prisma`.

**Tech Stack:** Docker Compose, PostgreSQL 16, Prisma, Next.js App Router, TypeScript, Vitest, Node.js scripts.

---

### File Structure

- Create `election-report-web/docker-compose.yml`: local PostgreSQL container.
- Modify `election-report-web/.env.example`: public-data API placeholders plus local DB placeholders.
- Modify `election-report-web/.env.local`: append DB variables without exposing the existing service key.
- Create `election-report-web/prisma/schema.prisma`: elections, election types, candidates, pledges, raw API responses, campaign materials, design analysis, and results.
- Create `election-report-web/src/lib/nec-common-code.test.ts`: tests for common-code parsing and DB upsert mapping.
- Create `election-report-web/src/lib/nec-common-code.ts`: normalizes CommonCodeService payloads and maps election type records.
- Create `election-report-web/scripts/check-db.mjs`: verifies Prisma can connect to PostgreSQL.
- Create `election-report-web/scripts/ingest-common-code.mjs`: stores CommonCodeService fetch runs, raw responses, elections, and election types.
- Modify `election-report-web/package.json`: add Prisma dependencies and DB scripts.
- Create `docs/erd/2026-06-01-election-data-erd.md`: ERD and phase plan.
- Create `docs/operations/2026-06-01-user-actions-oci-postgresql.md`: what the user needs to do for OCI operation.

### Tasks

- [x] Add DB environment variables:
  - `POSTGRES_USER=election_report`
  - `POSTGRES_PASSWORD=election_report_local_password`
  - `POSTGRES_DB=election_report`
  - `POSTGRES_PORT=5433`
  - `DATABASE_URL=postgresql://election_report:election_report_local_password@localhost:5433/election_report?schema=public`
- [x] Add Docker Compose service:
  - image: `postgres:16-alpine`
  - volume: `postgres-data:/var/lib/postgresql/data`
  - healthcheck: `pg_isready`
- [x] Install Prisma packages:
  - runtime dependency: `@prisma/client`
  - dev dependency: `prisma`
  - PostgreSQL adapter dependency: `@prisma/adapter-pg`
- [x] Write parsing tests first:
  - normalize single-item and multi-item CommonCodeService payloads.
  - map `sgId`, `sgTypecode`, and `sgTypeName` into election and election-type upsert input.
- [x] Implement `nec-common-code.ts` to satisfy tests.
- [x] Write `schema.prisma` with source tables:
  - `Election`, `ElectionType`, `Region`, `District`, `Party`, `Candidate`, `Pledge`, `FetchRun`, `RawApiResponse`, `CampaignMaterial`, `MaterialDesignAnalysis`, `ElectionResult`.
- [x] Start local DB:
  - `docker compose up -d db`
- [x] Generate and apply migration:
  - `npx prisma migrate dev --name init`
- [x] Add DB scripts:
  - `npm run db:check`
  - `npm run db:ingest:common-code`
  - `npm run prisma:studio`
- [x] Verify:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run db:check`
  - `npm run db:ingest:common-code`

### Current ERD Direction

- `Election` is the root for each election date/code, starting with `20260603`.
- `ElectionType` stores official NEC type codes such as `3` 시·도지사, `4` 구·시·군의 장, and `11` 교육감.
- `Candidate` links to election, election type, region/district, party, pledges, campaign materials, and results.
- `FetchRun` and `RawApiResponse` preserve API provenance so every normalized record can be audited against the raw official response.
- `CampaignMaterial` and `MaterialDesignAnalysis` are intentionally separate because PDF/image collection and design analysis will arrive after candidate/pledge ingestion.

### Self-Review

- The real public-data service key stays only in ignored local env files.
- The local DB port uses `5433` to reduce conflict with an existing PostgreSQL on `5432`.
- OCI deployment can reuse the same Compose service after replacing password, volume path, backup, and network policy.
- Raw API response storage is included before normalization so failed or changing NEC payloads remain traceable.
