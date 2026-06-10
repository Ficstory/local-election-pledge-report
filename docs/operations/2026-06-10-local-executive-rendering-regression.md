# 2026-06-10 지군구청장 렌더링 지연 회귀 트러블슈팅

## 증상

`구·시·군의 장선거` 탭 진입 시 초기 화면 렌더링이 오래 걸렸다. 2026-06-04에 단체장 분석을 lazy loading API로 분리했지만, 현재 코드에서는 초기 서버 렌더링 경로에서 다시 전체 공약 분석이 실행되고 있었다.

## 원인

`election-report-web/src/app/page.tsx`의 executive branch가 다음 작업을 한 요청 안에서 모두 수행했다.

1. 필터 옵션용 후보 조회
2. 분석용 전체 후보, 공약, 자료 조회
3. `analyzeMayorPledges()` 실행
4. `prepareMayorPledgeClientAnalysis()` 결과를 client component prop으로 직접 전달

이 구조는 2026-06-04 `executive-analysis` API 분리 이전 병목을 되살린 것이다. `MayorPledgeAnalysis`는 이미 `analysisUrl`을 받아 hydration 이후 fetch할 수 있고, `/api/executive-analysis`도 10분 in-process cache를 갖고 있었지만 `page.tsx`가 그 경로를 사용하지 않았다.

## 근거

- `src/app/page.tsx`가 `listElectionCandidatesByFilters()`로 무거운 후보 데이터를 조회했다.
- 같은 branch에서 `analyzeMayorPledges()`를 즉시 실행했다.
- 분석 결과를 `analysis={prepareMayorPledgeClientAnalysis(analysis)}`로 직접 넘겼다.
- 반면 `src/app/MayorPledgeAnalysis.tsx`는 `analysisUrl` prop이 있으면 로딩 상태를 먼저 렌더링하고 client-side fetch를 수행하도록 구현되어 있었다.
- `src/app/api/executive-analysis/route.ts`는 같은 조건의 재요청을 cache hit로 빠르게 응답할 수 있게 되어 있었다.

## 적용한 개선

`src/app/page.tsx`의 executive branch를 다시 lazy-loading 구조로 복구했다.

- `analyzeMayorPledges()`와 `prepareMayorPledgeClientAnalysis()` import 제거
- `candidateMatchesElectionTab()` 직접 사용 제거
- 초기 렌더링에서는 `listElectionCandidateOptionsByFilters()`만 실행
- `buildExecutiveAnalysisPath()`로 `/api/executive-analysis?...` URL 생성
- `MayorPledgeAnalysis`에 `analysisUrl`만 전달

이제 지군구청장 탭의 첫 화면은 탭, 필터, 로딩 상태만 렌더링하고, 무거운 공약 분석은 브라우저 hydration 이후 API route에서 수행된다.

## 기대 효과

- 탭 전환 또는 최초 진입 시 서버 응답이 전체 분석 완료를 기다리지 않는다.
- 같은 필터 조건의 분석 재요청은 기존 API cache hit를 사용한다.
- 사용자 체감상 "화면이 멈춘 상태"가 줄어든다.

## 남은 한계

이번 수정은 초기 렌더링 병목을 해결한다. 다만 API cache miss에서는 여전히 전체 후보 공약 분석을 수행하므로 첫 분석 응답은 느릴 수 있다.

다음 단계에서 더 줄이려면:

1. 분석 결과를 DB 테이블로 선계산한다.
2. election/region/party/candidate 조합별 summary를 materialized data로 저장한다.
3. 공약 목록 전체를 한 번에 내려주지 않고 API pagination으로 분리한다.
4. keyword별 공약 필터링도 client 전체 배열 필터가 아니라 서버 페이징으로 분리한다.

## 회귀 방지

`src/app/page.performance.test.ts`에 page source regression test를 추가해 `page.tsx`가 다시 `analyzeMayorPledges()`를 직접 호출하거나 `analysis` prop으로 분석 결과를 전달하지 않도록 확인한다.
