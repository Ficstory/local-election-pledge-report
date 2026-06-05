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
- 교육감 5대공약 키워드 분석 및 인터랙티브 워드클라우드

## 교육감 워드클라우드 분석

교육감 후보자의 5대공약 PDF를 대상으로 일반 배경어를 제거하고 세부 정책 키워드, 정책 분야, 반복 구문을 시각화합니다.

```powershell
cmd /c npm run generate:material-groups
python scripts/analyze-education-top-five-keywords.py
cmd /c npm run dev -- --hostname 127.0.0.1 --port 3001
```

분석 결과 페이지는 `/analysis/education-wordcloud`입니다. 현재 페이지는 `storage/analysis/20260603/education-top-five-keywords/summary.json`을 읽어 렌더링합니다.

워드클라우드는 [Jason Davies Word Cloud](https://www.jasondavies.com/wordcloud/)와 [`d3-cloud` examples](https://cesine.github.io/d3-cloud/examples/)를 기준으로 충돌 없는 중앙 패킹을 만들고, [Build UI Magnified Dock](https://buildui.com/recipes/magnified-dock)처럼 커서와 가까운 단어만 부드럽게 확대되도록 구현했습니다. 단어 크기는 빈도 차이가 눈에 들어오도록 지수 보정하고, 세부 키워드 탭의 색상은 후보자 언급률 기준으로 낮음은 주황/갈색, 중간은 청록, 높음은 진한 남색으로 표시합니다. 특히 교육감 세부 키워드의 언급률 분포가 57%~93% 구간에 몰려 있어, 색상 도메인을 0~100%가 아니라 57%↓~93%↑로 고정해 `교권`처럼 빈도는 중간이지만 언급률이 낮은 단어와 `환경`처럼 빈도는 중간이어도 언급률이 높은 단어가 갈라져 보이도록 했습니다. 정책 분야 탭은 단어 수가 적어 워드클라우드 대신 빈도 기반 버블 클러스터로 분리했습니다. 기본 브라우저 툴팁은 쓰지 않고, 호버한 단어의 실제 경계 바깥에 붙는 compact 정보 pill로 빈도, 후보자 수, 언급률을 보여줍니다.

## 다음 단계

- CommonCodeService로 `sgId` 확정
- 후보자 정보 API 수집 스크립트 작성
- 선거공약 정보 API 수집 스크립트 작성
- 수집 JSON을 `src/data` 대신 외부 `data/` 경로에서 읽도록 연결
