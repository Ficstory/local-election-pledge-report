# Architecture Boundary TODO

## 배경

현재 프로젝트는 `election-report-web` 단일 Next.js App Router 프로젝트 안에서 화면, API route, DB 접근, 데이터 수집/분석 스크립트를 함께 관리한다.

이 구조는 Next.js 풀스택 앱에서는 자연스러운 선택이지만, 프로젝트가 커질수록 프론트엔드와 서버 전용 로직의 책임 경계가 흐려질 수 있다. 당장 기능 동작에 문제가 있는 구조는 아니므로, 현재 시점에서는 대규모 리팩터링보다 TODO로 남기고 안정화 이후 정리한다.

## 현재 구조 요약

- `src/app`: 페이지, 레이아웃, API route를 포함한 Next.js App Router 진입점
- `src/app/**/page.tsx`: 화면 렌더링 중심 파일
- `src/app/**/route.ts`: API 응답, 다운로드, 자료 제공 같은 서버 route 파일
- `src/lib`: DB 조회, NEC API 연동, 분석 로직, 공통 유틸이 섞여 있는 영역
- `prisma`: DB schema와 migration
- `scripts`: 데이터 수집, 분석, OCR, 검증용 배치 스크립트
- `storage`: 수집 자료와 분석 산출물 저장 영역

## 정리 방향

### 1. 프론트 UI 경계 분리

- 공통 UI 컴포넌트는 `src/components`로 이동한다.
- 특정 도메인 화면에 종속된 컴포넌트는 `src/features/<domain>` 아래로 이동한다.
- `src/app/**/page.tsx`는 라우팅 진입점 역할만 맡기고, 실제 화면 구성은 feature/component 파일로 위임한다.

예상 구조:

```text
src/
  app/
  components/
  features/
    candidates/
    education-wordcloud/
    mayor-analysis/
```

### 2. 서버 전용 로직 분리

- DB 접근, Prisma client 사용, 서버에서만 실행되어야 하는 로직은 `src/server`로 이동한다.
- `route.ts` 파일은 요청 파싱, 응답 생성, 에러 처리 정도만 담당하도록 얇게 유지한다.
- 외부 API 호출 중 서버에서만 필요한 코드는 `src/server/external` 또는 도메인별 server 모듈로 분리한다.

예상 구조:

```text
src/
  server/
    db/
    election/
    materials/
    external/
```

### 3. 공통 유틸 역할 축소

- `src/lib`는 브라우저와 서버 양쪽에서 안전하게 사용할 수 있는 순수 유틸 중심으로 유지한다.
- DB, 파일시스템, 환경변수, 외부 API처럼 런타임 의존성이 큰 코드는 `src/server` 또는 `scripts`로 이동한다.

### 4. 데이터 수집/분석 스크립트 경계 명확화

- `scripts`는 앱 런타임 코드가 아니라 운영/배치 도구로 문서화한다.
- 수집, 분석, 검증 스크립트는 역할별 prefix를 유지한다.
  - `ingest-*`: 데이터 수집
  - `analyze-*`: 분석 산출물 생성
  - `check-*`, `inspect-*`: 검증/조사
- 앱에서 직접 import하지 않는다는 원칙을 README 또는 운영 문서에 명시한다.

### 5. storage 경계 명확화

- `storage`는 소스 코드가 아니라 수집 자료와 분석 결과 저장소로 본다.
- 실제 배포 환경에서는 object storage, DB, 별도 artifact 저장소로 이전 가능한 영역으로 취급한다.
- 앱 코드에서 `storage` 경로를 직접 많이 참조한다면 서버 계층에 접근 함수를 두고 한 곳에서 관리한다.

## 우선순위

1. `src/server` 디렉터리 신설 후 DB/파일 접근 로직 이동
2. 큰 `page.tsx` 파일에서 UI 컴포넌트와 feature 로직 분리
3. `src/lib`에서 서버 전용 모듈과 순수 유틸 분리
4. route handler를 얇게 유지하도록 API 파일 정리
5. README에 현재 아키텍처와 향후 분리 계획 요약 추가

## 당장 하지 않는 이유

- 현재 구조는 Next.js 풀스택 프로젝트로 설명 가능한 구조다.
- 대규모 파일 이동은 import 경로, 테스트, route 동작 검증 비용이 크다.
- 기능 안정화와 데이터 검증이 먼저 필요한 단계라면 리팩터링은 후순위가 맞다.
- 문서로 개선 방향을 남겨두면 발표/인수인계 시 구조적 한계와 개선 계획을 설명할 수 있다.

## 발표용 설명

현재는 별도 백엔드 서버를 두지 않고 Next.js App Router의 API route와 Server Component를 활용한 풀스택 구조로 구현했다. 이후 유지보수성을 높이기 위해 UI 컴포넌트, 서버 전용 DB 접근 로직, 데이터 수집/분석 스크립트의 책임 경계를 더 명확히 분리할 계획이다.
