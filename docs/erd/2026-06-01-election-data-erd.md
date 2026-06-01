# Election Data ERD

Updated: 2026-06-01

This ERD covers the first storage foundation for official NEC API data plus later campaign-material/design-analysis work.

```mermaid
erDiagram
  Election ||--o{ ElectionType : has
  Election ||--o{ Candidate : includes
  Election ||--o{ FetchRun : fetched_for
  Election ||--o{ ElectionResult : reports
  ElectionType ||--o{ Candidate : classifies
  Region ||--o{ District : contains
  Region ||--o{ Candidate : covers
  District ||--o{ Candidate : narrows
  Party ||--o{ Candidate : nominates
  Candidate ||--o{ Pledge : offers
  Candidate ||--o{ CampaignMaterial : publishes
  Candidate ||--o| ElectionResult : receives
  CampaignMaterial ||--o| MaterialDesignAnalysis : analyzed_as
  FetchRun ||--o{ RawApiResponse : stores
  RawApiResponse ||--o{ Candidate : source_for
  RawApiResponse ||--o{ Pledge : source_for

  Election {
    string id PK "NEC sgId, e.g. 20260603"
    string name
    datetime voteDate
    datetime createdAt
    datetime updatedAt
  }

  ElectionType {
    string id PK
    string electionId FK
    string sgTypecode
    string name
    datetime createdAt
    datetime updatedAt
  }

  Region {
    string id PK
    string name
    datetime createdAt
    datetime updatedAt
  }

  District {
    string id PK
    string regionId FK
    string code
    string name
    datetime createdAt
    datetime updatedAt
  }

  Party {
    string id PK
    string name
    datetime createdAt
    datetime updatedAt
  }

  Candidate {
    string id PK
    string electionId FK
    string electionTypeId FK
    string regionId FK
    string districtId FK
    string partyId FK
    string rawApiResponseId FK
    string candidateApiId
    string name
    string ballotNumber
    string gender
    int age
    string job
    string education
    string career1
    string career2
    string status
    datetime createdAt
    datetime updatedAt
  }

  Pledge {
    string id PK
    string candidateId FK
    string rawApiResponseId FK
    string title
    string summary
    string category
    int priority
    json details
    datetime createdAt
    datetime updatedAt
  }

  FetchRun {
    string id PK
    string electionId FK
    string source
    string endpoint
    string electionTypeCode
    string status
    datetime startedAt
    datetime finishedAt
    int rowCount
    string errorMessage
  }

  RawApiResponse {
    string id PK
    string fetchRunId FK
    string source
    string endpoint
    string requestHash
    json requestMeta
    json responseBody
    datetime fetchedAt
  }

  CampaignMaterial {
    string id PK
    string candidateId FK
    string materialType
    string sourceUrl
    string storagePath
    string sha256
    int pageCount
    datetime collectedAt
    datetime createdAt
    datetime updatedAt
  }

  MaterialDesignAnalysis {
    string id PK
    string materialId FK
    json dominantColors
    string fontNotes
    string layoutNotes
    float imageRatio
    float textDensity
    datetime analyzedAt
    datetime createdAt
    datetime updatedAt
  }

  ElectionResult {
    string id PK
    string electionId FK
    string candidateId FK
    int voteCount
    decimal voteRate
    int rank
    boolean elected
    string sourceRawApiResponseId
    datetime createdAt
    datetime updatedAt
  }
```

## Build Phases

1. Storage foundation: Docker PostgreSQL, Prisma, migration, DB connection test.
2. API provenance: `FetchRun` and `RawApiResponse` first, then normalized official-code records.
3. Candidate and pledge ingestion: store official candidate rows and pledge rows with raw response references.
4. Campaign material collection: store PDF/image URL, local storage path, hash, page count, and collection status.
5. Design analysis: store colors, font notes, layout notes, image ratio, and text density as derived data.
6. Election result analysis: connect result rows back to candidates to compare pledges/material design against outcomes.

## Important Design Choices

- Raw API responses are first-class records, not temporary logs.
- Nullable region/district/party fields are allowed because early API payloads may not map cleanly.
- `ElectionType` uses official `sgTypecode`; this keeps market/governor/education-superintendent filtering aligned with NEC.
- Candidate API IDs are nullable until we confirm the stable key from the candidate endpoint response.
- Candidate `career1` and `career2` preserve the official candidate API career fields for detail-page inspection.
