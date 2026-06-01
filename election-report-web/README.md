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
NEXT_PUBLIC_DEFAULT_SG_ID=20260603
```

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
