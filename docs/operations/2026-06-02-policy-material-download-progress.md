# 2026-06-02 선거자료 다운로드 진행 로그

## 현재 결론

정책·공약마당 선거자료 메타데이터 수집과 PDF 다운로드를 완료했다. PDF 원본은 Git에 넣지 않고 로컬 캐시로만 둔다.

다음 작업은 **PDF 원본을 옮겨 다니는 것**이 아니라, 현재 로컬 캐시를 기준으로 분석 결과를 DB에 남기는 것이다.

## 완료된 작업

### 1. DB와 마이그레이션

- Docker Desktop 실행 후 PostgreSQL 컨테이너 시작
- 컨테이너: `election-report-postgres`
- 상태: healthy
- 포트: `localhost:5433`
- 적용된 migration:
  - `20260601200727_add_candidate_careers`
  - `20260602000000_add_policy_material_fields`

검증:

```powershell
cmd /c npm run db:check
cmd /c npx prisma migrate dev --name add_policy_material_fields
cmd /c npm run prisma:generate
cmd /c npx prisma validate
```

### 2. 선행 데이터 수집

공통코드:

```powershell
cmd /c npm run db:ingest:common-code
```

결과:

- raw pages: 2
- common-code rows: 192
- election type records: 150
- election types for `20260603`: 8

후보자:

```powershell
cmd /c npm run db:ingest:candidates
```

결과:

- `sgTypecode=3`: 54명
- `sgTypecode=4`: 585명
- `sgTypecode=11`: 58명
- 전체 후보자: 697명
- skipped missing key: 0

### 3. 정책자료 메타데이터 전체 수집

명령:

```powershell
cmd /c npm run db:ingest:policy-materials
```

결과:

- `sgTypecode=3`
  - targets: 16
  - raw pages: 16
  - list rows: 52
  - matched: 52
  - created: 150
  - updated: 6
- `sgTypecode=4`
  - targets: 253
  - raw pages: 253
  - list rows: 650
  - matched: 650
  - created: 1704
  - updated: 246
- `sgTypecode=11`
  - targets: 16
  - raw pages: 16
  - list rows: 58
  - matched: 58
  - created: 168
  - updated: 6

후보자 매칭 실패:

- missing `huboid`: 0
- no candidate match: 0

Idempotency 확인:

```powershell
cmd /c npm run db:ingest:policy-materials -- --sg-typecode=3 --region=1100 --limit-candidates=2
```

재실행 결과:

- created: 0
- updated: 6

### 4. PDF 다운로드

Smoke test:

```powershell
cmd /c npm run db:download:policy-materials -- --limit=2
```

전체 다운로드:

```powershell
cmd /c npm run db:download:policy-materials
```

결과:

- download targets: 1413
- downloaded: 1413
- reused existing: 0
- failed: 0

최종 DB 상태:

- 전체 `CampaignMaterial`: 2040
- `DOWNLOADED`: 1415
- `SKIPPED_NO_URL`: 625
- 실패: 0

자료 타입별:

- `ELECTION_BULLETIN`: 680
- `PLEDGE_DOCUMENT`: 680
- `TOP_FIVE_PLEDGES`: 680

로컬 파일 상태:

- 저장 위치: `election-report-web/storage/materials/20260603/{candidateApiId}/{fileName}`
- 파일 수: 1416
  - PDF 1415개
  - `.gitkeep` 1개
- 전체 용량: 약 5.24GB

## 다음 작업 시작점

다음 작업은 여기서 시작한다.

### A. 분석 파이프라인 설계

원본 PDF 전체를 옮기는 방식으로 작업하지 않는다. PDF는 `storage/materials`의 로컬 캐시로 두고, 분석 결과만 DB에 저장한다.

추천 분석 단위:

- PDF 기본 정보
  - page count
  - 파일 크기
  - sha256
  - MIME type
- 이미지/편집 분석
  - dominant colors
  - image ratio
  - text density
  - layout notes
  - font notes
- OCR 또는 텍스트 추출
  - 후보명/정당/선거명 검증
  - 핵심 구호
  - 공약 키워드
  - 위험 문구 또는 비교 분석용 문장

현재 Prisma에는 `MaterialDesignAnalysis`가 있으므로, 첫 단계는 이 테이블을 활용하거나 확장한다.

### B. 원본 PDF 이동 문제 처리

1415개 PDF, 약 5.24GB라 Git으로 옮기면 안 된다.

권장 방식:

1. 같은 작업 머신에서 분석을 계속한다.
   - 가장 단순하다.
   - `storagePath`가 이미 DB에 있으므로 바로 분석 가능하다.

2. 다른 머신으로 옮겨야 하면 PDF 디렉터리를 별도 아카이브/동기화 대상으로 본다.
   - 예: `robocopy`, `rclone`, NAS, S3/OCI Object Storage
   - Git에는 절대 넣지 않는다.

3. 장기적으로는 원본 PDF를 Object Storage에 올리고 DB에는 remote object key를 저장한다.
   - 예: `materials/20260603/{candidateApiId}/{fileName}`
   - 로컬 `storagePath`는 캐시 경로로만 사용한다.

4. 분석 산출물만 Git/DB에 남긴다.
   - 원본 PDF: 외부 저장소 또는 로컬 캐시
   - 분석 결과: DB
   - 작업 기록/리포트: Markdown 또는 UI

## 재개 명령

DB가 꺼져 있으면:

```powershell
docker compose up -d db
cmd /c npm run db:check
```

다운로드 상태 재확인:

```powershell
cmd /c node --experimental-strip-types -e "import('dotenv').then(async ({config})=>{config({path:'.env',quiet:true});config({path:'.env.local',override:true,quiet:true});const m=await import('./scripts/create-prisma-client.mjs');const prisma=m.createPrismaClient();const byStatus=await prisma.campaignMaterial.groupBy({by:['downloadStatus'],_count:{_all:true}});const byType=await prisma.campaignMaterial.groupBy({by:['materialType'],_count:{_all:true}});console.log(JSON.stringify({byStatus,byType},null,2));await prisma[String.fromCharCode(36)+'disconnect']();})"
```

남은 다운로드가 생겼을 때만:

```powershell
cmd /c npm run db:download:policy-materials
```

## 주의

- `election-report-web/storage/materials/**`는 `.gitignore`에 포함되어 있다.
- PDF 파일은 Git에 넣지 않는다.
- 전체 다운로드는 이미 완료되어 있으므로 다음 단계에서 다시 전체 다운로드를 반복할 필요는 없다.
- 다음 단계는 다운로드가 아니라 분석 결과 저장 구조와 분석 스크립트 구현이다.
