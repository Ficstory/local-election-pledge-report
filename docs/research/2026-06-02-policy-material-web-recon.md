# Policy Material Web Recon

Updated: 2026-06-02

## Conclusion

There is no confirmed `data.go.kr` OpenAPI that directly returns official campaign material PDF URLs such as candidate election pamphlets.

However, the official NEC policy site exposes campaign material metadata through internal web JSON endpoints, and the PDF files can be downloaded through the site's download endpoint.

This means campaign material collection is feasible, but it should be treated as **official web collection**, not as a public-data OpenAPI integration.

## Checked Sources

- `data.go.kr`
  - Candidate info API exists.
  - Pledge text API exists.
  - No candidate campaign-material PDF OpenAPI was found.
- `policy.nec.go.kr`
  - Candidate pledge/material pages expose internal JSON endpoints.
  - Candidate PDF paths are present in JSON fields.
  - PDF download endpoint returns real PDF bytes.
- `library.nec.go.kr`
  - Long-term archive/search route exists for candidate campaign materials.
  - The page is form/search driven and appears better suited as a later fallback/archive source.

## Official Web Entry Points

Candidate pledge/material page:

```text
https://policy.nec.go.kr/plc/commiment/initUCACommiment.do?menuId=CNDDT25
```

Main policy page:

```text
https://policy.nec.go.kr/plc/main/initUMAMain.do
```

Long-term NEC library campaign material search:

```text
https://library.nec.go.kr/neweps/3/1/paper.do
```

## Candidate Material JSON Endpoint

Endpoint:

```text
POST https://policy.nec.go.kr/plc/commiment/initUCACommimentList.do
```

Working sample params for `sgTypecode=3`, Seoul governor candidates:

```text
sgId=20260603
subSgId=320260603
hRegionId=1100
hGuId=
hSggId=
sgTypecode=3
pageIndex=1
phGuId=
elecEndYn=N
```

Observed result:

```text
totalCnt=6
list.length=6
```

Working sample params for all `sgTypecode=3` regions:

```text
sgId=20260603
subSgId=320260603
hRegionId=ALL
hGuId=
hSggId=
sgTypecode=3
pageIndex=1
phGuId=
elecEndYn=N
```

Observed result:

```text
totalCnt=52
list.length=15
```

Working sample params for `sgTypecode=11`, Seoul education superintendent candidates:

```text
sgId=20260603
subSgId=1120260603
hRegionId=1100
hGuId=
hSggId=
sgTypecode=11
pageIndex=1
phGuId=
elecEndYn=N
```

Observed result:

```text
totalCnt=8
list.length=8
```

Working sample params for `sgTypecode=4`, Seoul municipal mayor candidates:

```text
sgId=20260603
subSgId=420260603
hRegionId=1100
hGuId=ALL
hSggId=ALL
sgTypecode=4
pageIndex=1
phGuId=
elecEndYn=N
```

Observed result:

```text
totalCnt=61
list.length=15
```

## Important Field Mapping

Candidate list rows include:

```text
sgId
subSgName
sggname
hbjname
huboid
jdname
fileDispYn
fileinfo
```

The important candidate linkage field is:

```text
huboid
```

This matches the local DB field:

```text
Candidate.candidateApiId
```

This makes official candidate material rows linkable to our existing candidate rows.

## `fileinfo` Format

Sample candidate:

```text
hbjname=정원오
huboid=100157144
jdname=더불어민주당
sggname=서울특별시
```

Raw `fileinfo` sample:

```text
선거공보||20260603/PDF/PBINFO/1100/003_100157144_20260520_1.pdf||||1||HEIGHT||Y||00||01,
선거공약서||||||0||HEIGHT||Y||||00,
5대공약||20260603/PDF/P5_PRMS_PUB/1100/001_100157144_20260516_1.pdf||11551||1||HEIGHT||Y||00||01
```

Observed material entries are comma-separated. Each material entry uses `||` as a field separator.

Useful positions observed from page JavaScript:

- `subtemp[0]`: material type, e.g. `선거공보`, `책자형선거공보`, `전단형선거공보`, `5대공약`, `10대공약`
- `subtemp[1]`: PDF path when present
- `subtemp[5]`: PDF preview flag
- `subtemp[7]`: open status code; `01` means open

The collection script should parse this defensively because some entries are empty placeholders, especially `선거공약서`.

## PDF Download Endpoint

Endpoint:

```text
GET https://policy.nec.go.kr/plc/common/downloadFile.do
```

Query params:

```text
requestedFileName=<display/download filename>
requestedFullPath=<path from fileinfo>
```

Tested candidate pamphlet:

```text
requestedFullPath=20260603/PDF/PBINFO/1100/003_100157144_20260520_1.pdf
requestedFileName=20260603_서울특별시_정원오_선거공보.pdf
```

Observed response:

```text
Status: 200
Content-Type: application/pdf;charset=UTF-8
Length: 17,984,095 bytes
First bytes: 25-50-44-46-2D-31-2E-36
Starts with PDF signature: true
```

This confirms the official web endpoint can return actual PDF bytes.

## Party Policy PDF Check

The main policy page also exposes party policy PDFs through:

```text
POST https://policy.nec.go.kr/plc/main/initUMAMainTab.do
```

Sample params:

```text
sgId=20260603
menuSgId=320260603
cnddtYn=Y
```

Sample returned file path:

```text
20260603/PDF/PARTY_PLC_PUB/007_100_20260507_1.pdf
```

Download endpoint test for this party-policy PDF also returned real PDF bytes:

```text
Status: 200
Content-Type: application/pdf;charset=UTF-8
Starts with PDF signature: true
```

Candidate materials should be prioritized first. Party policy material can be added later as a separate collection type.

## Implementation Direction

Create a reconnaissance script first:

```text
election-report-web/scripts/inspect-policy-material-web.mjs
```

Initial script responsibilities:

- Read sample candidates from local DB.
- Call `initUCACommimentList.do` for selected election types and regions.
- Parse `fileinfo`.
- Print sanitized material rows.
- Confirm candidate linkage by `huboid`.
- Do not write DB rows yet.

Then create parser tests:

```text
election-report-web/src/lib/nec-policy-material.test.ts
election-report-web/src/lib/nec-policy-material.ts
```

Parser responsibilities:

- Parse comma-separated `fileinfo` entries.
- Split entries by `||`.
- Keep only entries with a real PDF path.
- Normalize material type.
- Preserve original path, flags, and open status.
- Link by `huboid`.

Then add metadata ingestion:

```text
election-report-web/scripts/ingest-policy-materials.mjs
```

Metadata ingestion responsibilities:

- Store the web JSON response as raw provenance.
- Upsert `CampaignMaterial` records.
- Do not download PDFs in this first ingestion pass.

Then add download script:

```text
election-report-web/scripts/download-policy-materials.mjs
```

Download responsibilities:

- Use `downloadFile.do`.
- Store files under ignored local storage.
- Compute `sha256`.
- Store `storagePath`, `sha256`, size, and `collectedAt`.
- Skip already-downloaded files.

## Suggested Schema Additions

Current `CampaignMaterial` has enough for a first pass, but these additions are likely useful:

```text
sourceMaterialId String?
sourcePageUrl    String?
sourceFilePath   String?
title            String?
fileName         String?
mimeType         String?
fileSizeBytes    Int?
downloadStatus   String?
errorMessage     String?
```

Recommended stable uniqueness:

```text
candidateId + materialType + sourceFilePath
```

## Risks

- These are official web endpoints, not public OpenAPI endpoints.
- Endpoint names and params may change without public API versioning.
- PDF files may disappear after the election period.
- Some candidates may not submit all material types.
- Some rows include placeholders with no PDF path.
- PDF files should not be committed to Git.
- Collection should be rate-limited.

## Immediate Next Step

Implement and run:

```powershell
cmd /c npm run inspect:policy-material-web
```

This should only inspect and print results. DB writes should come after parser tests.

