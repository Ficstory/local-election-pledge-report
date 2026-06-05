# 2026-06-04 시장 탭 렌더링 지연 트러블슈팅

## 증상

교육감 탭에서 시장 탭으로 이동할 때 서버 응답이 비정상적으로 느렸다.

초기 계측값:

```text
education_total=0.353220 size=48514
mayor_total=37.576654 size=4193906
```

교육감 탭은 약 0.35초였고, 시장 탭은 약 37.6초였다. 시장 응답 크기도 약 4.19MB로 교육감 탭보다 훨씬 컸다.

## 원인

### 1. 시장 탭에서 전체 후보 공약을 즉시 분석

`src/app/page.tsx`의 시장 탭 경로는 `governor`, `municipal_mayor` 후보를 모두 조회한 뒤 `analyzeMayorPledges()`를 즉시 실행했다.

실제 데이터 기준:

```text
executive_raw_rows=639
mayor_candidates=230
mayor_pledges=1100
```

DB 조회 자체는 약 0.35초 수준이라 주 병목은 아니었다.

### 2. stopword Set을 공약마다 반복 생성

`tokenizePledgeText()`가 호출될 때마다 공통 stopword, 시장 stopword, 후보명/정당/지역 stopword를 다시 정규화하고 새 `Set`을 만들었다.

초기 세부 계측:

```text
extraStopwords=1380
tokenize_all_pledges_with_candidate_stopwords_ms=4139
tokenize_all_pledges_second_pass_with_candidate_stopwords_ms=4249
candidate_keyword_tokenization_shape_ms=4522
```

전체 키워드 집계와 후보별 키워드 집계가 같은 공약 텍스트를 반복 토큰화하면서 `analyzeMayorPledges()` 단독으로 약 14.8초가 걸렸다.

### 3. 정책 분야 분류가 규칙 키워드를 반복 정규화

`classifyPolicyCategories()`가 모든 분석 키워드에 대해 정책 분야 규칙 키워드를 매번 `normalizeKoreanKeyword()`로 다시 정규화했다.

합성 계측:

```text
classify_synthetic_ms=3306
```

### 4. client component props가 과도하게 큼

서버에서 계산한 전체 키워드 22,926개와 긴 공약 본문 전체를 `MayorPledgeAnalysis` client component로 넘겼다.

초기 payload:

```text
analysis_all_bytes=3809983
keywords_all_bytes=1630003
pledgeItems_all_bytes=2133704
```

화면은 top 34 키워드와 공약 snippet만 필요했지만 전체 데이터를 직렬화했다.

## 적용한 해결

### 1. stopword Set 사전 생성

`createKeywordStopwordSet()`을 추가해 분석 1회당 stopword Set을 한 번만 생성하게 했다. 공백이 포함된 stopword는 전체 문자열과 분리 토큰을 함께 정규화한다.

### 2. 공약별 토큰 재사용

`buildPledgeItems()`가 공약 텍스트를 만들 때 `keywordTokens`와 unique `keywords`를 함께 저장한다.

이후 전체 키워드 집계와 후보별 키워드 집계는 저장된 토큰 배열을 재사용한다.

### 3. 정책 분야 규칙 정규화 축소

`classifyPolicyCategories()`에서 정책 분야 규칙 키워드는 함수 호출당 한 번만 정규화하고, 키워드 순회에서는 단순 문자열 비교만 수행한다.

### 4. client analysis 압축

`prepareMayorPledgeClientAnalysis()`를 추가해 client component로 넘기기 전 데이터를 줄인다.

- 전체 키워드 중 화면에서 쓰는 top 34개만 전달
- 공약 본문은 170자 snippet으로 축소
- 공약별 keywords는 word cloud/top/candidate badge에서 선택 가능한 키워드만 유지
- 서버 분석용 `keywordTokens`는 client payload에서 제거

## 개선 후 계측

서버 분석 계측:

```text
executive_raw_queries_ms=394
mayor_input={"candidates":230,"pledges":1100}
analysis_ms=661
client_analysis_bytes=1349268
```

실제 HTTP 계측:

```text
education_total=1.398611 size=54413
mayor_total=3.052396 size=1558122
mayor_second_total=2.706566 size=1558122
```

시장 탭은 약 37.6초에서 약 2.7초로 줄었다. 응답 크기는 약 4.19MB에서 약 1.56MB로 줄었다.

## 회귀 방지 테스트

추가한 테스트:

- `createKeywordStopwordSet()`으로 사전 정규화된 stopword Set 재사용 확인
- `analyzeMayorPledges()`가 공약별 `keywords`를 저장하는지 확인
- `prepareMayorPledgeClientAnalysis()`가 client payload를 축소하는지 확인
- `classifyPolicyCategories()`가 8,000개 키워드 기준 과도하게 느려지지 않는지 확인

실행 명령:

```bash
npm test -- src/lib/mayor-pledge-analysis.test.ts src/app/MayorPledgeAnalysis.test.tsx
```

## 남은 개선 여지

현재 병목은 크게 줄었지만 시장 탭은 여전히 모든 시장 공약 1,100개를 서버에서 분석한 뒤 1.56MB를 전달한다.

다음 단계에서 더 줄이려면:

1. 지역/정당/후보 필터를 DB 쿼리 단계로 더 밀어 넣는다.
2. 시장 키워드 분석 결과를 선계산 테이블이나 캐시로 분리한다.
3. 공약 목록은 첫 화면 5개만 내려주고, 키워드 선택/더보기는 서버 액션이나 API route로 페이징한다.
4. `dynamic = "force-dynamic"`이 필요한지 재검토하고, 정적/캐시 가능한 범위를 분리한다.
