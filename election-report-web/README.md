# 정치한번 읽어볼까 - Election Report Web

전국 지방선거 후보자 공약, 공보물 수집 상태, 디자인 분석 결과를 확인하기 위한 Next.js 웹앱입니다.

## 실행

```powershell
cmd /c npm install
cmd /c npm run dev
```

PowerShell 실행 정책 때문에 `npm`이 막히면 `cmd /c npm ...` 형태로 실행합니다.

## 환경변수

`.env.example`을 기준으로 `.env.local`을 만들어 사용합니다. 실제 공공데이터포털 ServiceKey는 저장소에 커밋하지 않습니다.

```text
DATA_GO_KR_SERVICE_KEY=
DATABASE_URL=
NEXT_PUBLIC_DEFAULT_SG_ID=20260603
```

## 데이터 인수인계

후속 작업자에게는 Git 커밋, PostgreSQL dump, 원문 자료 archive를 분리해서 공유합니다. `.env`, `.env.local`, DB dump, 원문 PDF archive는 저장소에 커밋하지 않습니다.

현재 인수인계 산출물은 저장소 루트 기준 `handoff/2026-06-04/`에 있습니다.

```text
handoff/2026-06-04/
├─ election-report-db-20260604.dump
├─ election-report-materials-20260604.tar
├─ handoff-manifest.json
└─ checksums.sha256
```

공유할 항목은 다음 4개입니다.

- 코드: `recovery/codex-session-unstable` 브랜치의 commit `1683850e7732499e32db12354b19ceb052a5166f`
- DB: `election-report-db-20260604.dump` PostgreSQL custom dump
- 원문 자료: `election-report-materials-20260604.tar`
- 검증 정보: `handoff-manifest.json`, `checksums.sha256`

현재 snapshot 기준 DB row count는 후보자 697명, 공약 3,340개, 공보물 metadata 2,040개입니다. 원문 자료 archive는 `storage/materials` 1,416개 파일과 `storage/material-groups` manifest 3개 파일을 포함합니다.

체크섬은 공유받은 쪽에서 먼저 확인합니다.

```powershell
Get-FileHash ..\handoff\2026-06-04\election-report-db-20260604.dump -Algorithm SHA256
Get-FileHash ..\handoff\2026-06-04\election-report-materials-20260604.tar -Algorithm SHA256
Get-Content ..\handoff\2026-06-04\checksums.sha256
```

DB 복구는 PostgreSQL 16 client가 없으면 Docker의 `postgres:16-alpine` 이미지를 사용합니다. Prisma의 `DATABASE_URL`에 `schema=public`이 붙어 있으면 `pg_restore`가 읽지 못하므로 복구용 URL에서는 해당 query parameter만 제거합니다.

```powershell
$env:PGCLIENT_DATABASE_URL = $env:DATABASE_URL `
  -replace '@localhost:', '@host.docker.internal:' `
  -replace '@127\.0\.0\.1:', '@host.docker.internal:' `
  -replace '([?&])schema=[^&]*&?', '$1'
$env:PGCLIENT_DATABASE_URL = $env:PGCLIENT_DATABASE_URL -replace '\?&', '?' -replace '[?&]$', ''

docker run --rm --env PGCLIENT_DATABASE_URL `
  -v "$((Resolve-Path ..\handoff\2026-06-04).Path):/backup" `
  postgres:16-alpine `
  sh -c 'pg_restore --clean --if-exists --no-owner --no-acl --dbname "$PGCLIENT_DATABASE_URL" /backup/election-report-db-20260604.dump'
```

원문 자료는 앱 루트에서 `storage/` 아래로 풀면 DB의 `CampaignMaterial.storagePath`와 맞습니다.

```powershell
tar.exe -xf ..\handoff\2026-06-04\election-report-materials-20260604.tar -C .\storage
```

API key, DB password, 실제 `DATABASE_URL`은 Git이나 dump manifest에 넣지 말고 비밀번호 관리자나 비공개 채널로 따로 전달합니다.

## 현재 범위

- Next.js App Router 프로젝트 기본 구조
- 후보자/공약/공보물 분석 타입 정의
- mock 후보자 데이터
- 요약 통계 유틸 테스트
- 대시보드 및 후보자 상세 화면

## 다음 단계

- CommonCodeService로 `sgId` 확정
- 후보자 정보 API 수집 스크립트 작성
- 선거공약 정보 API 수집 스크립트 작성
- 수집 JSON을 `src/data` 대신 외부 `data/` 경로에서 읽도록 연결
