# Candidate Pledge Local Ingestion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect official candidate and pledge data locally, store raw API responses, normalize rows into PostgreSQL, and prepare the data for web inspection and later campaign-material analysis.

**Architecture:** Keep the local-first stack. Use Docker PostgreSQL as the source of truth, Prisma as the schema/migration layer, and Node scripts for official API ingestion. Every API request must create a `FetchRun` and one or more `RawApiResponse` rows before normalized data is upserted.

**Tech Stack:** Next.js, Node.js scripts, Prisma, PostgreSQL 16 via Docker Compose, Vitest.

---

## Scope

This plan covers:

- candidate list collection
- pledge text collection
- raw API response retention
- normalized DB upserts
- focused tests for API payload parsing/mapping

This plan does not cover:

- campaign material PDF/image crawling
- visual design analysis
- election result ingestion
- cloud deployment

## Files To Create Or Modify

- Create `election-report-web/src/lib/nec-candidate.ts`
  - normalize candidate API payloads
  - map official fields into DB upsert records
- Create `election-report-web/src/lib/nec-candidate.test.ts`
  - test single-row, multi-row, missing-field, and duplicate-key behavior
- Create `election-report-web/scripts/inspect-candidate-api.mjs`
  - call the official endpoint once and print sanitized field names/sample shape
- Create `election-report-web/scripts/ingest-candidates.mjs`
  - store `FetchRun`, `RawApiResponse`, and normalized `Candidate` rows
- Create `election-report-web/src/lib/nec-pledge.ts`
  - normalize pledge API payloads
  - map official fields into DB upsert records
- Create `election-report-web/src/lib/nec-pledge.test.ts`
  - test pledge payload parsing and candidate linkage assumptions
- Create `election-report-web/scripts/inspect-pledge-api.mjs`
  - call the official endpoint once and print sanitized field names/sample shape
- Create `election-report-web/scripts/ingest-pledges.mjs`
  - store `FetchRun`, `RawApiResponse`, and normalized `Pledge` rows
- Modify `election-report-web/package.json`
  - add inspect and ingestion scripts
- Modify `docs/erd/2026-06-01-election-data-erd.md`
  - update notes if candidate/pledge API stable IDs differ from current assumptions

## Task 1: Candidate API Reconnaissance

- [ ] Add `inspect-candidate-api.mjs`.
- [ ] Use `.env.local` values only.
- [ ] Mask `ServiceKey` in all console output.
- [ ] Request candidates for:
  - `sgId=20260603`
  - `sgTypecode=3`
  - then repeat for `4` and `11`
- [ ] Print:
  - result code
  - total count
  - first three sanitized rows
  - detected field names
- [ ] Do not store any new DB data in this task.

## Task 2: Candidate Parser Tests

- [ ] Write failing tests in `nec-candidate.test.ts`.
- [ ] Test that official payload item arrays normalize into internal candidate rows.
- [ ] Test that a single item response is wrapped into an array.
- [ ] Test that missing candidate stable keys are handled without throwing.
- [ ] Test that region/district/party names are preserved even when codes are missing.

## Task 3: Candidate Parser Implementation

- [ ] Implement `nec-candidate.ts`.
- [ ] Keep parser functions pure.
- [ ] Return plain records that ingestion scripts can upsert.
- [ ] Run:

```powershell
cmd /c npm test -- src/lib/nec-candidate.test.ts
```

## Task 4: Candidate DB Ingestion

- [ ] Add `ingest-candidates.mjs`.
- [ ] Create one `FetchRun` per election type request.
- [ ] Store each raw API page in `RawApiResponse`.
- [ ] Upsert:
  - `Region`
  - `District`
  - `Party`
  - `Candidate`
- [ ] Link each candidate to:
  - `Election`
  - `ElectionType`
  - `RawApiResponse`
- [ ] Run:

```powershell
cmd /c npm run db:ingest:candidates
```

## Task 5: Pledge API Reconnaissance

- [ ] Add `inspect-pledge-api.mjs`.
- [ ] Use confirmed candidate keys from the candidate endpoint.
- [ ] Print sanitized sample payloads and field names.
- [ ] Confirm whether pledges are candidate-level, election-type-level, or region-level.

## Task 6: Pledge Parser Tests

- [ ] Write failing tests in `nec-pledge.test.ts`.
- [ ] Test multi-pledge parsing.
- [ ] Test single item response wrapping.
- [ ] Test stable linkage back to a candidate.
- [ ] Test long text fields without truncation.

## Task 7: Pledge Parser Implementation

- [ ] Implement `nec-pledge.ts`.
- [ ] Preserve full pledge text in `Pledge.details` when the official payload has structured fields.
- [ ] Keep title/summary/category fields readable for the UI.
- [ ] Run:

```powershell
cmd /c npm test -- src/lib/nec-pledge.test.ts
```

## Task 8: Pledge DB Ingestion

- [ ] Add `ingest-pledges.mjs`.
- [ ] Store raw API pages in `RawApiResponse`.
- [ ] Upsert or replace pledge rows per candidate according to the stable official key.
- [ ] Link each pledge to:
  - `Candidate`
  - `RawApiResponse`
- [ ] Run:

```powershell
cmd /c npm run db:ingest:pledges
```

## Task 9: Verification

- [ ] Run tests:

```powershell
cmd /c npm test
```

- [ ] Run lint:

```powershell
cmd /c npm run lint
```

- [ ] Run build:

```powershell
cmd /c npm run build
```

- [ ] Check DB:

```powershell
cmd /c npm run db:check
```

- [ ] Confirm DB counts with a script or Prisma query:
  - elections
  - election types
  - candidates by election type
  - pledges by election type
  - raw API responses by source

## Risks

- Official API field names may differ from public documentation.
- Candidate stable IDs may be composite rather than a single field.
- Pledge endpoint may require candidate-specific parameters that are not obvious until candidate response inspection.
- Re-running ingestion can duplicate rows if stable keys are wrong.
- Public-data API can return XML or error payloads even when JSON is requested.

## Exit Criteria

- Candidate rows for `sgTypecode` `3`, `4`, and `11` are stored.
- Pledge rows are linked to candidates where official keys allow it.
- Raw API responses are stored for all successful calls.
- Re-running ingestion does not duplicate normalized rows.
- The web app can start reading from PostgreSQL in the next phase.
