# Next Work Roadmap

Updated: 2026-06-02

## Current Baseline

The project is now at the local data-inspection stage.

- Repository is connected to GitHub.
- Next.js app exists under `election-report-web/`.
- Local PostgreSQL runs through Docker Compose on `localhost:5433`.
- Prisma schema and migrations are in place.
- Official NEC/public-data responses are stored before normalization through `FetchRun` and `RawApiResponse`.
- Common code, candidate, and pledge data are normalized into PostgreSQL.
- The web UI reads from PostgreSQL instead of mock data.
- Candidate detail pages show official pledge text and candidate career fields.

Current local DB baseline:

- elections: `42`
- election types for `20260603`: `8`
- selected election types currently collected:
  - `3`: governor/metropolitan mayor level
  - `4`: municipal mayor/local district head level
  - `11`: education superintendent
- candidates: `697`
- candidates with official career fields: `697`
- pledges: `3,345`
- raw API responses:
  - `NEC_COMMON_CODE`: `2`
  - `NEC_CANDIDATE`: `16`
  - `NEC_PLEDGE`: `697`

Latest pushed commit:

- `c9ce87a Add NEC data ingestion and DB-backed UI`

## Work Sequence So Far

### 1. Project Direction

- Decided to keep the project local-first during the data collection phase.
- Deferred cloud deployment until the app has useful local data and a clearer public-operation need.
- Chose local Docker PostgreSQL as the working source of truth.

### 2. Next.js App Foundation

- Created `election-report-web/`.
- Added the initial dashboard and candidate detail routes.
- Kept real API keys in ignored local env files.
- Kept placeholder variables in `.env.example`.

### 3. Local PostgreSQL And Prisma Foundation

- Added Docker Compose PostgreSQL.
- Added Prisma 7 and the PostgreSQL adapter.
- Added Prisma config and the initial schema.
- Created the first migration.
- Added `npm run db:check`.

### 4. Common Code Collection

- Verified the public-data service key.
- Confirmed the 2026 local election id:
  - `NEXT_PUBLIC_DEFAULT_SG_ID=20260603`
- Ingested CommonCodeService data.
- Stored raw API responses and normalized election/election-type records.

### 5. Candidate API Reconnaissance

- Added `inspect-candidate-api`.
- Confirmed endpoint:
  - `getPofelcddRegistSttusInfoInqire`
- Confirmed stable candidate key:
  - `huboid`
- Confirmed the useful election type codes for the initial product slice:
  - `3`
  - `4`
  - `11`

### 6. Candidate Parser And Ingestion

- Added `src/lib/nec-candidate.ts`.
- Added parser tests.
- Added `scripts/ingest-candidates.mjs`.
- Ingested `697` candidates.
- Added `career1` and `career2` persistence.
- Re-ingested candidates so every candidate has official career fields populated.

### 7. Pledge API Reconnaissance

- Added `inspect-pledge-api`.
- Confirmed endpoint:
  - `getCnddtElecPrmsInfoInqire`
- Confirmed candidate-level lookup:
  - `sgId`
  - `sgTypecode`
  - `cnddtId`
- Confirmed pledge slot shape:
  - `prmsOrd1..10`
  - `prmsRealmName1..10`
  - `prmsTitle1..10`
  - `prmmCont1..10`

### 8. Pledge Parser And Ingestion

- Added `src/lib/nec-pledge.ts`.
- Added parser tests.
- Added `scripts/ingest-pledges.mjs`.
- Ingested pledge rows for all `697` candidates.
- Stored `3,345` normalized pledge records.
- Preserved full official pledge text in `Pledge.details.content`.

### 9. DB-Backed Web UI

- Added `src/lib/election-db.ts`.
- Switched dashboard data from mock data to PostgreSQL.
- Added DB-backed search and filtering:
  - candidate/name search
  - party search
  - region search
  - office/election type filter
  - region filter
  - party filter
  - server-side pagination
- Switched candidate detail pages to DB-backed dynamic rendering.
- Wrapped pledge full text in a disclosure UI.
- Added candidate career display on detail pages.

### 10. Verification And Git

- Verified:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run db:check`
  - local HTTP checks for dashboard and candidate detail routes
- Committed and pushed to `origin/main`.

## Next Work Decision

The next immediate work should be campaign material collection, not election result ingestion.

Reason:

- The election date for `20260603` is still the active target point.
- Official result data may not be reliable or available until after polls close and NEC/public-data result endpoints publish rows.
- Candidate and pledge data are already ready locally, so the product can now move to the campaign-material layer.

Next immediate target:

- Collect official campaign material metadata and files for the already ingested candidates.
- Store material source URLs, local file paths, hashes, and collection status in `CampaignMaterial`.
- Make the web UI show material collection status per candidate.

Deferred target:

- Election result ingestion should be implemented after official result endpoints return stable data for `20260603`.

## Roadmap Overview

### Phase A. Campaign Material API Reconnaissance

Goal:

- Find the official source for candidate campaign materials such as election pamphlets, policy documents, poster files, or downloadable PDFs/images.

Expected outputs:

- A sanitized inspection script.
- A short documentation note with endpoint, required params, response fields, and sample shape.
- A decision on whether files are directly downloadable URLs or require another lookup step.

Likely files:

- `election-report-web/scripts/inspect-material-api.mjs`
- `election-report-web/src/lib/nec-material.ts`
- `election-report-web/src/lib/nec-material.test.ts`
- `docs/operations/2026-06-02-campaign-material-collection.md`

Checklist:

- [ ] Identify the correct official/public-data service for campaign material.
- [ ] Confirm whether `DATA_GO_KR_SERVICE_KEY` is enough or another service approval is required.
- [ ] Inspect one known candidate for each selected `sgTypecode`:
  - [ ] `3`
  - [ ] `4`
  - [ ] `11`
- [ ] Print sanitized request URL, result code, total count, field names, and sample rows.
- [ ] Document which field is the stable material key.
- [ ] Document which field contains the downloadable URL, if present.
- [ ] Confirm whether files are PDF, image, HTML page, or mixed.

Exit criteria:

- We know the endpoint and params.
- We know whether files can be collected automatically.
- We know what schema changes are needed before ingestion.

### Phase B. Campaign Material Schema And Storage

Goal:

- Make `CampaignMaterial` ready for real collection.

Current table already has:

- `candidateId`
- `materialType`
- `sourceUrl`
- `storagePath`
- `sha256`
- `pageCount`
- `collectedAt`

Possible additions after reconnaissance:

- `sourceMaterialId`
- `title`
- `fileName`
- `mimeType`
- `fileSizeBytes`
- `downloadStatus`
- `errorMessage`

Checklist:

- [ ] Review material API fields against current `CampaignMaterial`.
- [ ] Add only necessary columns.
- [ ] Create Prisma migration.
- [ ] Generate Prisma Client.
- [ ] Update ERD.
- [ ] Add DB indexes if material lookup needs them.

Exit criteria:

- DB can represent one or more materials per candidate.
- Re-running ingestion will not duplicate normalized material rows.

### Phase C. Campaign Material Parser Tests

Goal:

- Parse official material metadata safely before adding DB writes.

Checklist:

- [ ] Test multi-row official payloads.
- [ ] Test single-item official payloads.
- [ ] Test missing file URL.
- [ ] Test missing stable material key.
- [ ] Test duplicate material rows.
- [ ] Test candidate linkage by official candidate key.
- [ ] Test material type normalization.

Expected command:

```powershell
cmd /c npm test -- src/lib/nec-material.test.ts
```

Exit criteria:

- Parser is pure and does not touch the network or DB.
- Parser output is ready for DB upsert.

### Phase D. Campaign Material Metadata Ingestion

Goal:

- Store material metadata for each already ingested candidate.

Likely file:

- `election-report-web/scripts/ingest-materials.mjs`

Checklist:

- [ ] Load candidates from DB.
- [ ] For each candidate, call the material endpoint with official keys.
- [ ] Store one `FetchRun` for the material ingestion job.
- [ ] Store each raw response in `RawApiResponse`.
- [ ] Upsert normalized `CampaignMaterial` records.
- [ ] Do not download large files yet in this phase unless the endpoint only provides direct files.
- [ ] Print summary:
  - candidates processed
  - raw responses stored
  - materials found
  - materials upserted
  - missing URL count
  - failed request count

Expected command:

```powershell
cmd /c npm run db:ingest:materials
```

Exit criteria:

- Candidate rows show material metadata where official data exists.
- Re-running metadata ingestion does not duplicate rows.

### Phase E. Campaign Material File Download

Goal:

- Download official PDFs/images to local storage with hash-based traceability.

Recommended local storage:

- `election-report-web/storage/materials/`

Git policy:

- Downloaded PDF/image files should not be committed unless they are tiny curated fixtures.
- Add storage output to `.gitignore` if not already ignored.

Checklist:

- [ ] Add `storage/materials/.gitkeep` only if needed.
- [ ] Ensure actual downloaded files are ignored.
- [ ] Download with rate limiting.
- [ ] Save files under deterministic paths:
  - candidate id
  - material id or hash
  - original extension
- [ ] Compute `sha256`.
- [ ] Store `storagePath`, `sha256`, `fileSizeBytes`, and `collectedAt`.
- [ ] Skip download if same hash/path already exists.
- [ ] Record failures without aborting the full batch.

Expected command:

```powershell
cmd /c npm run db:download:materials
```

Exit criteria:

- Material files are present locally.
- DB points to local file paths.
- Duplicate downloads are avoided.

### Phase F. Material UI

Goal:

- Make material availability visible in the app.

Candidate list additions:

- material count
- material collection status
- quick filter for candidates with/without materials

Candidate detail additions:

- material list
- source URL
- local file status
- file hash
- page count if known

Checklist:

- [ ] Extend DB query layer to include campaign materials.
- [ ] Add material status to candidate list table.
- [ ] Add material section to candidate detail page.
- [ ] Add filters:
  - [ ] has material
  - [ ] missing material
  - [ ] failed download
- [ ] Verify responsive layout.

Exit criteria:

- The user can identify which candidates have official materials and which still need collection.

### Phase G. PDF Page Count And Text Extraction

Goal:

- Convert collected files into analyzable local artifacts.

Checklist:

- [ ] Determine local PDF tooling available in the project environment.
- [ ] Extract page count for PDFs.
- [ ] Extract text where possible.
- [ ] Store page count in `CampaignMaterial.pageCount`.
- [ ] Add a derived table only if text extraction becomes too large for current schema.
- [ ] Add tests for text/page-count helpers with small fixtures.

Exit criteria:

- The app can show page counts.
- Later analysis can compare pledge text, material text, and visual design.

### Phase H. Design Analysis V1

Goal:

- Produce first useful material-level design notes without overbuilding.

Initial metrics:

- dominant colors
- approximate text density
- image/text ratio
- font/layout notes

Checklist:

- [ ] Render or inspect first page of each PDF/image.
- [ ] Compute dominant colors.
- [ ] Compute rough image/text density.
- [ ] Store derived data in `MaterialDesignAnalysis`.
- [ ] Show the analysis on candidate detail pages.

Exit criteria:

- A candidate detail page can show basic visual/material analysis from local files.

### Phase I. Result Ingestion After Official Result Data Is Available

Goal:

- Link final result data to candidates so the app can compare pledges/materials against outcomes.

This phase should wait until official data for `20260603` is available.

Checklist:

- [ ] Inspect NEC/public-data result endpoints.
- [ ] Confirm params and stable candidate linkage.
- [ ] Add result parser and tests.
- [ ] Add ingestion script.
- [ ] Store raw responses.
- [ ] Upsert `ElectionResult`.
- [ ] Add result columns to dashboard and detail pages.
- [ ] Add sorting/filtering by elected status, rank, and vote rate.

Exit criteria:

- Every result row links back to a normalized candidate where possible.
- UI can show candidate result status without manual matching.

## Immediate Next Task Plan

Start with Phase A.

Recommended first task:

- Create `inspect-material-api.mjs`.
- Use `DATA_GO_KR_SERVICE_KEY`.
- Pick 3 sample candidates from DB:
  - one `sgTypecode=3`
  - one `sgTypecode=4`
  - one `sgTypecode=11`
- Try official campaign-material endpoints.
- Print sanitized field names and sample payloads.
- Do not write DB data yet.

Definition of done:

- We can answer:
  - Which endpoint provides material metadata?
  - Which params are required?
  - Does the current API key have access?
  - Are file URLs directly downloadable?
  - What schema changes are needed?

## Standard Verification Commands

Run from `election-report-web/`.

```powershell
cmd /c npm test
cmd /c npm run lint
cmd /c npm run build
cmd /c npm run db:check
```

When a migration is added:

```powershell
cmd /c npx prisma validate
cmd /c npx prisma migrate deploy
cmd /c npm run prisma:generate
```

When a local route changes:

```powershell
cmd /c npm run dev -- -p 3000
```

Then verify:

- `/`
- one candidate detail route
- one filtered candidate list route

## Risks And Decisions To Revisit

- Public-data service approval may be separate for campaign material APIs.
- Material endpoints may return web pages instead of direct file URLs.
- Large PDF downloads should stay out of Git.
- File downloads should be resumable and idempotent.
- Result ingestion should not be treated as ready until official result rows are available.
- UI should stay dense and inspection-focused, not become a landing page.

