# 2026-06-02 선거자료 다운로드/복원 가이드

## 결론

PDF 원본은 GitHub에 올리지 않는다.

GitHub에는 다음만 올린다.

- 코드
- Prisma schema/migration
- 수집/다운로드 스크립트
- 운영 문서
- 분석용 manifest

GitHub에 올리지 않는 것:

- `election-report-web/storage/materials/**`
- 다운로드된 PDF 원본 1415개
- 로컬 PostgreSQL 데이터 볼륨
- `.env`, `.env.local`, API key

현재 PDF 캐시는 약 5.24GB다. Git repo에 넣으면 clone/push가 느려지고, GitHub 파일 크기 제한에도 걸릴 수 있다.

## 현재 로컬 상태

기준 시점: 2026-06-02

- 후보자: 697명
- `CampaignMaterial`: 2040개
- 다운로드 완료 PDF: 1415개
- URL 없는 자료: 625개
- 다운로드 실패: 0개
- PDF 저장 위치: `election-report-web/storage/materials/20260603/{candidateApiId}/{fileName}`
- 분석 그룹 manifest:
  - `election-report-web/storage/material-groups/20260603/local-heads-downloaded.jsonl`
  - `election-report-web/storage/material-groups/20260603/education-superintendents-downloaded.jsonl`
  - `election-report-web/storage/material-groups/20260603/summary.json`

## 다른 PC에서 복원하는 방법

복원 방법은 두 가지다.

### 방법 A. API/CDN에서 다시 수집하고 다운로드

원본 PDF를 따로 옮기지 않아도 된다. 시간이 걸리지만 가장 단순하고 재현 가능하다.

1. 저장소 clone

```powershell
git clone <repo-url>
cd "정치한번 읽어볼까 PJT/election-report-web"
```

2. 의존성 설치

```powershell
cmd /c npm ci
```

3. 환경변수 준비

`election-report-web/.env.local`을 만든다. 최소한 아래 값이 필요하다.

```text
DATABASE_URL=postgresql://election_report:election_report_local_password@localhost:5433/election_report
NEXT_PUBLIC_DEFAULT_SG_ID=20260603
DATA_GO_KR_SERVICE_KEY=<공공데이터포털 서비스키>
NEC_COMMON_CODE_BASE_URL=https://apis.data.go.kr/9760000/CommonCodeService
NEC_CANDIDATE_BASE_URL=https://apis.data.go.kr/9760000/PofelcddInfoInqireService
NEC_PLEDGE_BASE_URL=https://apis.data.go.kr/9760000/ElecPrmsInfoInqireService
```

기존 `.env.local`은 Git에 올리지 않는다.

4. PostgreSQL 실행

```powershell
docker compose up -d db
cmd /c npm run db:check
```

5. Prisma migration 적용

```powershell
cmd /c npx prisma migrate dev
cmd /c npm run prisma:generate
```

6. 선행 데이터 수집

```powershell
cmd /c npm run db:ingest:common-code
cmd /c npm run db:ingest:candidates
```

7. 정책자료 메타데이터 수집

```powershell
cmd /c npm run db:ingest:policy-materials
```

8. PDF 다운로드

처음에는 smoke test로 확인한다.

```powershell
cmd /c npm run db:download:policy-materials -- --limit=2
```

문제가 없으면 전체 다운로드를 실행한다.

```powershell
cmd /c npm run db:download:policy-materials
```

전체 다운로드는 약 5GB 이상이므로 네트워크와 디스크 여유를 확인하고 실행한다.

9. 분석 manifest 재생성

현재 manifest는 Git에 포함하지만, DB/PDF를 새로 만든 경우 다시 생성하는 편이 안전하다.

현재는 임시 쿼리로 생성했으므로 다음 작업에서 정식 스크립트로 분리하는 것이 좋다.

기준 출력 위치:

```text
election-report-web/storage/material-groups/20260603/
```

### 방법 B. PDF 캐시를 별도 저장소에서 복사

이미 다운로드된 PDF 5.24GB를 외장 SSD, NAS, Google Drive, OneDrive, S3, OCI Object Storage 등으로 옮긴 뒤 새 PC에 복사한다.

추천 복사 대상:

```text
election-report-web/storage/materials/
```

Windows에서 폴더 복사 예시:

```powershell
robocopy "D:\backup\materials" "election-report-web\storage\materials" /E
```

복사 후에도 DB는 필요하다. DB는 둘 중 하나로 준비한다.

- 방법 A의 4-7단계를 실행해서 DB를 재생성한다.
- 또는 별도 `pg_dump` 백업을 복원한다.

## DB 백업을 따로 만들 때

Git에는 DB dump도 넣지 않는다. 필요하면 별도 저장소나 외장 디스크에 둔다.

백업 생성 예시:

```powershell
docker exec election-report-postgres pg_dump -U election_report -d election_report -Fc -f /tmp/election_report.dump
docker cp election-report-postgres:/tmp/election_report.dump .\election_report.dump
```

복원 예시:

```powershell
docker compose up -d db
docker cp .\election_report.dump election-report-postgres:/tmp/election_report.dump
docker exec election-report-postgres pg_restore -U election_report -d election_report --clean --if-exists /tmp/election_report.dump
cmd /c npm run db:check
```

주의:

- `election_report.dump`는 Git에 넣지 않는다.
- 백업에는 수집된 raw response와 후보자/자료 메타데이터가 들어간다.
- PDF 파일 자체는 DB dump에 들어가지 않는다.

## 복원 검증 명령

DB 연결:

```powershell
cmd /c npm run db:check
```

다운로드 상태 집계:

```powershell
cmd /c node --experimental-strip-types -e "import('dotenv').then(async ({config})=>{config({path:'.env',quiet:true});config({path:'.env.local',override:true,quiet:true});const m=await import('./scripts/create-prisma-client.mjs');const prisma=m.createPrismaClient();const byStatus=await prisma.campaignMaterial.groupBy({by:['downloadStatus'],_count:{_all:true}});const byType=await prisma.campaignMaterial.groupBy({by:['materialType'],_count:{_all:true}});console.log(JSON.stringify({byStatus,byType},null,2));await prisma[String.fromCharCode(36)+'disconnect']();})"
```

예상 상태:

```text
DOWNLOADED: 1415
SKIPPED_NO_URL: 625
ELECTION_BULLETIN: 680
PLEDGE_DOCUMENT: 680
TOP_FIVE_PLEDGES: 680
```

로컬 PDF 용량 확인:

```powershell
$files = Get-ChildItem -Recurse -File -LiteralPath "storage\materials"
$sum = ($files | Measure-Object -Property Length -Sum).Sum
[PSCustomObject]@{
  FileCount = $files.Count
  TotalGB = [math]::Round($sum / 1GB, 2)
}
```

예상:

```text
FileCount: 1416
TotalGB: 약 5.24
```

`.gitkeep` 1개가 포함되어 파일 수는 PDF 수보다 1개 많을 수 있다.

## GitHub에 올리는 파일 기준

커밋 대상:

- `docs/**`
- `election-report-web/src/**`
- `election-report-web/scripts/**`
- `election-report-web/prisma/**`
- `election-report-web/package.json`
- `election-report-web/storage/material-groups/**`
- `election-report-web/storage/materials/.gitkeep`

커밋 제외:

- `election-report-web/storage/materials/20260603/**`
- `.env`
- `.env.local`
- DB dump
- 압축한 PDF archive

## 다음 작업 권장

다음 단계에서 정식 스크립트로 만들면 좋은 것:

```text
election-report-web/scripts/generate-material-groups.mjs
election-report-web/scripts/export-policy-material-db-dump.mjs
```

지금은 복원 절차가 문서화되어 있으므로 다른 PC에서는 API/CDN 재수집 또는 PDF 캐시 복사 방식 중 하나로 이어갈 수 있다.
