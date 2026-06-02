# 2026-06-02 선거자료 분석 그룹 분리

## 목적

다운로드된 정책자료 PDF를 분석하기 전에 후보군을 두 그룹으로 나눈다.

- 시장·도지사·구청장·군수: `sgTypecode=3`, `sgTypecode=4`
- 교육감: `sgTypecode=11`

PDF 파일을 물리적으로 옮기지는 않는다. 원본은 그대로 `election-report-web/storage/materials`에 두고, 분석용 manifest만 별도로 생성한다.

## 생성된 manifest

기준: `CampaignMaterial.downloadStatus = DOWNLOADED`

```text
election-report-web/storage/material-groups/20260603/local-heads-downloaded.jsonl
election-report-web/storage/material-groups/20260603/education-superintendents-downloaded.jsonl
election-report-web/storage/material-groups/20260603/summary.json
```

각 JSONL row에는 다음 정보가 들어 있다.

- groupKey
- groupLabel
- materialId
- materialType
- title
- fileName
- fileSizeBytes
- mimeType
- sha256
- sourceUrl
- storagePath
- candidate
  - id
  - candidateApiId
  - name
  - ballotNumber
  - partyName
  - regionName
  - districtName
  - sgTypecode
  - electionTypeName

## 분리 결과

### 시장·도지사·구청장·군수

범위:

- `sgTypecode=3`: 시·도지사선거
- `sgTypecode=4`: 구·시·군의 장선거

집계:

- 후보자 수: 617
- 다운로드된 자료 수: 1284
- 총 용량: 약 4906.37MB

자료 유형:

- `ELECTION_BULLETIN`: 613
- `TOP_FIVE_PLEDGES`: 611
- `PLEDGE_DOCUMENT`: 60

선거종류별 자료 수:

- `sgTypecode=3`: 114
- `sgTypecode=4`: 1170

### 교육감

범위:

- `sgTypecode=11`: 교육감선거

집계:

- 후보자 수: 58
- 다운로드된 자료 수: 131
- 총 용량: 약 462.36MB

자료 유형:

- `ELECTION_BULLETIN`: 58
- `TOP_FIVE_PLEDGES`: 58
- `PLEDGE_DOCUMENT`: 15

선거종류별 자료 수:

- `sgTypecode=11`: 131

## 다음 분석 시작점

첫 분석은 두 그룹을 섞지 말고 아래 순서로 진행한다.

1. 교육감 그룹
   - 후보 수와 자료 수가 작다.
   - 교육 정책 언어가 비교적 독립적이라 분석 기준 잡기에 좋다.
   - manifest: `education-superintendents-downloaded.jsonl`

2. 시장·도지사·구청장·군수 그룹
   - 자료 수가 많고 지역/직책 편차가 크다.
   - 교육감 그룹에서 만든 분석 스키마를 적용한 뒤 보정한다.
   - manifest: `local-heads-downloaded.jsonl`

## 주의

- 이 manifest는 PDF 원본을 복사하지 않는다.
- Git에는 PDF를 넣지 않는다.
- 분석 스크립트는 `storagePath`를 읽어 PDF에 접근하면 된다.
- 분석 결과는 DB의 `MaterialDesignAnalysis` 또는 별도 확장 테이블에 저장한다.
