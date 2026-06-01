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

- [x] Add `inspect-candidate-api.mjs`.
- [x] Use `.env.local` values only.
- [x] Mask `ServiceKey` in all console output.
- [x] Request candidates for:
  - `sgId=20260603`
  - `sgTypecode=3`
  - then repeat for `4` and `11`
- [x] Print:
  - result code
  - total count
  - first three sanitized rows
  - detected field names
- [x] Do not store any new DB data in this task.

## Task 2: Candidate Parser Tests

- [x] Write failing tests in `nec-candidate.test.ts`.
- [x] Test that official payload item arrays normalize into internal candidate rows.
- [x] Test that a single item response is wrapped into an array.
- [x] Test that missing candidate stable keys are handled without throwing.
- [x] Test that region/district/party names are preserved even when codes are missing.

## Task 3: Candidate Parser Implementation

- [x] Implement `nec-candidate.ts`.
- [x] Keep parser functions pure.
- [x] Return plain records that ingestion scripts can upsert.
- [x] Run:

```powershell
cmd /c npm test -- src/lib/nec-candidate.test.ts
```

## Task 4: Candidate DB Ingestion

- [x] Add `ingest-candidates.mjs`.
- [x] Create one `FetchRun` per election type request.
- [x] Store each raw API page in `RawApiResponse`.
- [x] Upsert:
  - `Region`
  - `District`
  - `Party`
  - `Candidate`
- [x] Preserve official candidate career fields:
  - `career1`
  - `career2`
- [x] Link each candidate to:
  - `Election`
  - `ElectionType`
  - `RawApiResponse`
- [x] Run:

```powershell
cmd /c npm run db:ingest:candidates
```

## Task 5: Pledge API Reconnaissance

- [x] Add `inspect-pledge-api.mjs`.
- [x] Use confirmed candidate keys from the candidate endpoint.
- [x] Print sanitized sample payloads and field names.
  - Actual pledge content fields are `prmmCont1` through `prmmCont10`.
- [x] Confirm whether pledges are candidate-level, election-type-level, or region-level.

## Task 6: Pledge Parser Tests

- [x] Write failing tests in `nec-pledge.test.ts`.
- [x] Test multi-pledge parsing.
- [x] Test single item response wrapping.
- [x] Test stable linkage back to a candidate.
- [x] Test long text fields without truncation.

## Task 7: Pledge Parser Implementation

- [x] Implement `nec-pledge.ts`.
- [x] Preserve full pledge text in `Pledge.details` when the official payload has structured fields.
- [x] Keep title/summary/category fields readable for the UI.
- [x] Run:

```powershell
cmd /c npm test -- src/lib/nec-pledge.test.ts
```

## Task 8: Pledge DB Ingestion

- [x] Add `ingest-pledges.mjs`.
- [x] Store raw API pages in `RawApiResponse`.
- [x] Upsert or replace pledge rows per candidate according to the stable official key.
- [x] Link each pledge to:
  - `Candidate`
  - `RawApiResponse`
- [x] Run:

```powershell
cmd /c npm run db:ingest:pledges
```

## Task 9: Verification

- [x] Run tests:

```powershell
cmd /c npm test
```

- [x] Run lint:

```powershell
cmd /c npm run lint
```

- [x] Run build:

```powershell
cmd /c npm run build
```

- [x] Check DB:

```powershell
cmd /c npm run db:check
```

- [x] Confirm DB counts with a script or Prisma query:
  - elections
  - election types
  - candidates by election type
  - pledges by election type
  - raw API responses by source
- [x] Confirm `697` of `697` candidates have official career fields populated after candidate re-ingestion.

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

## Handoff To Next Work

This plan is complete. The next detailed roadmap is:

- `docs/roadmap/2026-06-02-next-work-roadmap.md`

Immediate next task:

- Start campaign material API reconnaissance.
- Confirm the official endpoint and required params.
- Confirm whether `DATA_GO_KR_SERVICE_KEY` has access.
- Do not write material DB rows until the endpoint response shape is confirmed.
