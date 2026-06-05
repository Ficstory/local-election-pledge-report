# 2026-06-04 단체장 분석 초기 렌더링 분리 트러블슈팅

## 증상

단체장 탭 진입 시 서버 렌더링이 여전히 느렸다. 이전 최적화로 키워드 분석 CPU 비용은 줄였지만, 첫 화면 요청 안에서 전체 분석을 수행하는 구조는 그대로 남아 있었다.

재계측값:

```text
education_total=0.860657 size=53821
mayor_total=6.053026 size=4069567
mayor_region_total=1.354448 size=435030
```

지역 필터가 있으면 빠르고 전체 단체장 탭이 느린 패턴이므로, 병목은 특정 UI 렌더링보다 전체 분석 데이터 규모에 있었다.

## 원인

`src/app/page.tsx`가 executive 탭 요청을 받을 때 다음 작업을 한 요청 안에서 모두 수행했다.

1. 후보 전체 조회
2. 공약 전체 조회
3. 자료 metadata 조회
4. 전체 공약 키워드 분석
5. 분석 결과를 client component props로 직렬화

현재 `local-executive` 기준 실제 규모:

```text
candidate_rows=585
pledge_rows=2795
analysis_ms=1866
client_analysis_bytes=3562284
```

즉 탭 클릭이 곧 "DB 전체 조회 + 전체 텍스트 분석 + 3MB 이상 RSC payload 생성"이었다.

## 구조적 판단

이 문제는 `analyzeMayorPledges()` 내부 최적화만으로 해결할 수 없다. 초기 화면에서 필요한 데이터와 분석 패널에서 필요한 데이터의 성격이 다르기 때문이다.

- 초기 화면: 탭, 필터 옵션, 로딩 상태
- 분석 패널: 키워드 cloud, 후보별 키워드, 공약 목록

두 데이터를 같은 서버 렌더링 경로에서 처리하면 전체 단체장 탭은 데이터가 늘어날수록 계속 느려진다.

## 적용한 해결

### 1. 초기 렌더링에서 분석 제거

`src/app/page.tsx`의 executive branch에서 `analyzeMayorPledges()` 호출을 제거했다. 이제 page shell은 분석 결과를 만들지 않고 `analysisUrl`만 client component에 넘긴다.

### 2. 후보 옵션 조회를 얇게 분리

`listElectionCandidateOptionsByFilters()`를 추가했다.

기존 `listElectionCandidatesByFilters()`는 후보, 공약, 자료, raw response까지 포함한다. 초기 필터 select를 만들기에는 과했다.

새 옵션 조회는 다음 필드만 가져온다.

- id
- name
- party.name
- region.name
- district.name

### 3. 분석 API route 추가

`GET /api/executive-analysis`를 추가했다.

쿼리 예:

```text
/api/executive-analysis?election=local-executive&region=서울특별시
```

동작:

1. election 탭을 파싱한다.
2. region/party는 DB 후보 조회 조건으로 밀어 넣는다.
3. q는 DB 후보 검색에 넣지 않고 공약 본문 분석 필터로 유지한다.
4. 분석 결과를 `prepareMayorPledgeClientAnalysis()`로 축소한다.
5. 같은 조건은 10분 TTL in-process cache로 반환한다.

### 4. Client component 지연 로딩

`MayorPledgeAnalysis`는 `analysis` prop이 없으면 서버 렌더 시 `data-analysis-state="loading"` 상태만 출력한다.

브라우저 hydration 후 `analysisUrl`을 fetch하고, 응답이 오면 분석 패널을 렌더링한다.

## 개선 후 계측

```text
shell_local_total=0.409972 size=168570
api_local_first_total=7.201717 size=3562353
api_local_second_total=0.052463 size=3562352
```

의미:

- 초기 탭 렌더링은 약 0.41초로 분리됐다.
- 분석 API 첫 miss는 여전히 전체 분석을 수행하므로 느릴 수 있다.
- 같은 조건 재요청은 cache hit로 약 0.05초다.

## 회귀 방지 테스트

추가한 테스트:

- `MayorPledgeAnalysis`가 분석 props 없이 로딩 상태만 렌더링하는지 확인
- 분석 API helper가 education 요청을 거부하는지 확인
- `q`가 후보 DB 필터가 아니라 분석 필터에만 들어가는지 확인
- 분석 API path가 안정적인 순서로 생성되는지 확인

실행 명령:

```bash
npm test -- src/app/MayorPledgeAnalysis.test.tsx src/lib/executive-analysis-api.test.ts
```

## 남은 한계

이 변경은 "초기 렌더링"을 해결한다. 분석 API 첫 miss는 여전히 전체 단체장 공약을 분석하므로 느릴 수 있다.

다음 단계에서 API miss 자체까지 줄이려면:

1. 분석 결과를 DB 테이블로 선계산한다.
2. election/region/party/candidate 조합별 materialized summary를 저장한다.
3. 공약 목록은 현재처럼 전체를 내려주지 말고 API pagination으로 나눈다.
4. keyword별 공약 필터링도 client 전체 배열 필터가 아니라 서버 페이징으로 분리한다.

현재 우선순위는 "탭 전환 시 초기 화면이 멈추지 않게 하는 것"이며, 이 변경은 그 경로의 병목을 제거한다.
