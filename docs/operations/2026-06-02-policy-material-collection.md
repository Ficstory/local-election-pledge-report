# 2026-06-02 정책·공약마당 선거자료 수집 운영 메모

## 수집 근거

공공데이터포털 OpenAPI에서는 후보자 선거공보, 선거공약서, 5대공약 PDF 파일을 직접 반환하는 API를 확인하지 못했다. 후보자 기본정보와 공약 텍스트 OpenAPI는 별도로 존재하지만, PDF 자료는 중앙선거관리위원회 정책·공약마당 웹 화면이 호출하는 내부 JSON endpoint의 `fileinfo` 필드에 들어 있다.

이번 파이프라인은 public OpenAPI 연동이 아니라 공식 웹 endpoint 기반 수집으로 취급한다.

## 수집 범위

- `sgId=20260603`
- `sgTypecode=3`: 시·도지사선거
- `sgTypecode=4`: 구·시·군의 장선거
- `sgTypecode=11`: 교육감선거
- 자료 유형
  - `선거공보` -> `ELECTION_BULLETIN`
  - `선거공약서` -> `PLEDGE_DOCUMENT`
  - `5대공약` -> `TOP_FIVE_PLEDGES`
- `선거벽보`는 아직 확인된 PDF 경로가 없어 `UNKNOWN`으로 파싱만 가능하며 이번 수집 대상에서는 미확인 상태로 남긴다.

## Endpoint 구조

후보자공약 페이지:

```text
https://policy.nec.go.kr/plc/commiment/initUCACommiment.do?menuId=CNDDT25
```

내부 JSON endpoint:

```text
POST https://policy.nec.go.kr/plc/commiment/initUCACommimentRegion.do
POST https://policy.nec.go.kr/plc/commiment/initUCACommimentGu.do
POST https://policy.nec.go.kr/plc/commiment/initUCACommimentSgg.do
POST https://policy.nec.go.kr/plc/commiment/initUCACommimentList.do
```

`subSgId`는 확인된 화면 호출 기준으로 `${sgTypecode}${sgId}` 형식이다.

## 호출 파라미터

`sgTypecode=3`, `sgTypecode=11`:

```text
initUCACommimentRegion.do
sgId=20260603&subSgId={sgTypecode}20260603

initUCACommimentList.do
sgId=20260603&subSgId={sgTypecode}20260603&sgTypecode={3|11}&pageIndex=1&elecEndYn=N&hRegionId={wiwid}&hGuId=&hSggId=&phGuId=
```

`sgTypecode=4`:

```text
initUCACommimentRegion.do
sgId=20260603&subSgId=420260603

initUCACommimentGu.do
sgId=20260603&subSgId=420260603&wiwsidocode={region.wiwid}&sortYn=

initUCACommimentSgg.do
sgId=20260603&subSgId=420260603&wiwsidocode={region.wiwid}&wiwid={gu.wiwid}&sortYn=

initUCACommimentList.do
sgId=20260603&subSgId=420260603&sgTypecode=4&pageIndex=1&elecEndYn=N&hRegionId={region.wiwid}&hGuId={gu.wiwid}&hSggId={sgg.sggid}&phGuId=
```

## `fileinfo` 파싱 규칙

- `fileinfo`는 쉼표로 자료 단위가 분리된다.
- 각 자료 단위는 `||`로 필드가 분리된다.
- `fields[0]`은 한글 자료명이다.
- `fields[1]`이 `.pdf` 경로이면 CDN URL을 만든다.
- `fields[5]`가 `Y`이면 미리보기 가능으로 본다.
- `fields[6]`은 변환 결과 코드로 저장한다.
- `fields[7]`은 공개 상태 코드로 저장한다. 확인된 JavaScript 기준 `01`은 공개 상태다.
- 필드 수가 달라도 파서가 실패하지 않도록 없는 값은 `null` 또는 `false`로 둔다.
- PDF 경로가 없는 `선거공약서` placeholder도 메타데이터 row로 저장하고 `SKIPPED_NO_URL` 상태로 둔다.

CDN URL 조합:

```text
https://cdn.nec.go.kr/policy_pdf/{fields[1]}
```

예시:

```text
https://cdn.nec.go.kr/policy_pdf/20260603/PDF/PBINFO/1100/003_100157144_20260520_1.pdf
```

## 재실행과 중복 방지

`CampaignMaterial`은 아래 안정 ID로 upsert한다.

```text
POLICY_NEC:{sgId}:{sgTypecode}:{huboid}:{materialType}:{sourceFilePath}
```

PDF 경로가 없는 자료는 마지막 값을 `NO_URL`로 둔다. DB unique key는 `sourceSystem + sourceMaterialId`이다. 재실행 시 같은 자료가 중복 생성되지 않고 기존 row가 갱신된다.

## 저장과 다운로드

메타데이터 수집(`db:ingest:policy-materials`)은 PDF를 다운로드하지 않는다. 다운로드는 별도 명령(`db:download:policy-materials`)으로만 수행한다.

저장 위치:

```text
election-report-web/storage/materials/20260603/{candidateApiId}/{fileName}
```

주의사항:

- `election-report-web/storage/materials/**`는 Git에서 제외한다.
- 대량 다운로드는 선거관리위원회 CDN에 부하를 줄 수 있으므로 smoke test는 `--limit=2`처럼 제한한다.
- 다운로드 실패는 batch 전체를 중단하지 않고 해당 row를 `FAILED`로 표시하고 `errorMessage`에 기록한다.
- 이미 같은 로컬 파일이 있으면 재사용하고 SHA-256, 크기, 저장 경로를 DB에 반영한다.

## 검증 명령

```powershell
cmd /c npm test
cmd /c npm run lint
cmd /c npm run build
cmd /c npm run db:check
cmd /c npx prisma validate
cmd /c npm run inspect:policy-materials -- --sg-typecode=3 --region=1100 --limit=2
cmd /c npm run inspect:policy-materials -- --sg-typecode=11 --region=1100 --limit=2
cmd /c npm run inspect:policy-materials -- --sg-typecode=4 --region=1100 --limit=2
cmd /c npm run db:ingest:policy-materials -- --sg-typecode=3 --region=1100 --limit-candidates=2
cmd /c npm run db:ingest:policy-materials -- --sg-typecode=4 --region=1100 --limit-candidates=2
cmd /c npm run db:ingest:policy-materials -- --sg-typecode=11 --region=1100 --limit-candidates=2
cmd /c npm run db:download:policy-materials -- --limit=2
```
