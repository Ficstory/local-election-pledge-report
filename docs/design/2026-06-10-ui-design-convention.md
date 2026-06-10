# 정치한번 읽어볼까 Responsive Web UI Design Convention v1.0

## 1. 디자인 방향

이 서비스는 선거 공약과 후보자 정보를 시민이 쉽게 탐색하는 **공공데이터 기반 분석 웹앱**이다.

따라서 화면은 마케팅 랜딩처럼 과하게 설득하지 않고, **정보 탐색 → 비교 → 원문 확인** 흐름을 중심으로 구성한다.

핵심 인상은 다음 세 가지다.

| 원칙 | 설명 |
|---|---|
| 신뢰감 | 중앙선거관리위원회 공개데이터 기반 서비스처럼 차분하고 정확하게 보여준다. |
| 탐색성 | 사용자가 후보, 공약, 지역, 선거자료를 빠르게 찾을 수 있어야 한다. |
| 비교 가능성 | 후보와 공약을 나란히 비교하기 쉬운 구조를 우선한다. |

---

## 2. 전체 레이아웃 패턴

### Desktop 기준

```txt
Header
↓
Hero / Page Intro
↓
Main Dashboard Card or Search Panel
↓
Summary / Insight Section
↓
Feature Cards or Result Cards
↓
Notice / Source Bar
↓
Footer
```

Desktop에서는 **좌우 분할 구조**를 적극 사용한다.

```txt
[좌측 텍스트 영역 40~45%] [우측 데이터 카드 영역 55~60%]
```

랜딩 화면에서는 왼쪽에 서비스 설명, 오른쪽에 실제 분석 UI 미리보기를 배치한다.

### Tablet / Narrow Desktop 기준

```txt
Header
↓
Intro Text
↓
Primary Actions
↓
Dashboard Preview
↓
Feature List
↓
Sub Cards
↓
Footer
```

화면이 줄어들면 좌우 분할을 유지하지 말고, **텍스트 → 액션 → 데이터 카드 → 기능 설명** 순서로 세로 정렬한다.

### Mobile / Small Width 기준

```txt
Logo + Menu
↓
Title
↓
Description
↓
Primary Button
↓
Secondary Button
↓
Data Preview Card
↓
Feature Accordion / List
↓
Related Cards
↓
Footer Links
```

모바일에서는 “보여주기 좋은 디자인”보다 **스크롤해도 정보 구조가 무너지지 않는 것**이 우선이다.

---

## 3. 반응형 Breakpoint Convention

| 구간 | Width | 레이아웃 규칙 |
|---|---:|---|
| Mobile | 360~767px | 1열, 카드 full width, 네비 햄버거 |
| Tablet | 768~1023px | 1열 중심, 일부 카드 2열 가능 |
| Desktop | 1024~1439px | 2열 레이아웃, 카드 그리드 |
| Wide Desktop | 1440px 이상 | 최대 컨테이너 폭 고정 |

권장 컨테이너 폭:

```css
--container-max: 1200px;
--container-wide: 1280px;
--page-padding-mobile: 20px;
--page-padding-tablet: 32px;
--page-padding-desktop: 48px;
```

---

## 4. 컬러 토큰

현재 목업의 톤을 유지하려면 색상은 많이 늘리지 않는 것이 좋다.

```css
:root {
  --color-bg: #F7F9FC;
  --color-surface: #FFFFFF;
  --color-surface-soft: #F3F6FB;

  --color-text-primary: #111827;
  --color-text-secondary: #4B5563;
  --color-text-muted: #6B7280;

  --color-line: #DDE3EC;
  --color-line-soft: #E8EDF5;

  --color-blue: #2563EB;
  --color-blue-dark: #1D4ED8;
  --color-blue-soft: #EAF1FF;

  --color-green: #10B981;
  --color-green-soft: #E7F8F1;

  --color-red: #EF4444;
  --color-red-soft: #FEECEC;

  --color-gray-chip: #F1F5F9;
}
```

### 사용 규칙

| 색상 | 사용처 |
|---|---|
| Blue | 활성 메뉴, 주요 버튼, 선택 상태, 링크 |
| Green | 당선, 긍정 상태, 완료 상태 |
| Red | 낙선, 경고성 상태 |
| Gray | 비활성, 보조 설명, 미확인 상태 |

중요한 것은 **파란색을 너무 많이 쓰지 않는 것**이다. CTA, 활성 탭, 선택 후보 정도에만 강하게 사용한다.

---

## 5. Typography Convention

서비스명과 제목은 신뢰감 있는 굵은 산세리프를 사용한다.

권장 폰트:

```css
font-family: Pretendard, "Noto Sans KR", system-ui, sans-serif;
```

### 타입 스케일

| 역할 | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Page Title | 44~56px | 34~40px | 700 |
| Section Title | 24~28px | 20~24px | 700 |
| Card Title | 18~20px | 17~18px | 700 |
| Body | 16~18px | 15~16px | 400 |
| Caption | 13~14px | 12~13px | 400 |
| Button | 15~16px | 15px | 600 |

### 줄 간격

```css
--line-height-title: 1.18;
--line-height-body: 1.65;
--line-height-compact: 1.45;
```

공공 데이터 화면에서는 본문이 빽빽해질 수 있으므로, 카드 내부 텍스트는 `1.45~1.55`, 설명 문장은 `1.6~1.7` 정도가 적당하다.

---

## 6. Spacing Convention

전체 간격은 8px 기반으로 맞춘다.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### 권장 적용

| 영역 | 간격 |
|---|---:|
| Header height | 64~72px |
| Section vertical gap | 64~96px |
| Card padding desktop | 24~32px |
| Card padding mobile | 18~22px |
| Card gap desktop | 20~24px |
| Card gap mobile | 12~16px |
| Button height | 44~52px |

---

## 7. Radius / Shadow Convention

이 서비스는 공공 데이터 도구이므로 과한 둥근 카드나 그림자는 피한다.

```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-panel: 16px;

--shadow-card: 0 8px 24px rgba(15, 23, 42, 0.06);
--shadow-panel: 0 16px 40px rgba(15, 23, 42, 0.08);
```

### 사용 규칙

| 요소 | Radius |
|---|---:|
| Button | 6~8px |
| Input | 6~8px |
| Candidate Card | 8px 이하 |
| Dashboard Preview Panel | 16px |
| Large Landing Mockup Card | 20px 이하 |

후보자 검색, 비교표, 공약 카드처럼 **실제 데이터가 담기는 화면**에서는 radius를 작게 유지한다.

---

## 8. Header / Navigation Pattern

### Desktop

```txt
[브랜드명]       [공약 분석] [후보자 검색] [교육감 키워드] [데이터 출처]
```

랜딩에서는 오른쪽 버튼을 둘 수 있지만, 검색 도구 화면에서는 CTA를 제거한다.

### Mobile

```txt
[브랜드명]                         [햄버거]
```

모바일에서 메뉴는 숨긴다.
햄버거 클릭 시 아래 방향 drawer 또는 full-screen sheet로 표시한다.

### Active Menu

```css
.nav-item.active {
  color: var(--color-blue);
  border-bottom: 2px solid var(--color-blue);
  font-weight: 700;
}
```

---

## 9. Button Convention

### Primary Button

주요 행동 하나에만 사용한다.

예시:

- 공약 선택 분석 보기
- 후보자 검색
- 비교에 추가

```css
.button-primary {
  background: var(--color-blue);
  color: white;
  border: 1px solid var(--color-blue);
  height: 48px;
  border-radius: 8px;
  font-weight: 600;
}
```

### Secondary Button

원문 보기, 후보 상세, 상세 필터 등에 사용한다.

```css
.button-secondary {
  background: white;
  color: var(--color-blue);
  border: 1px solid #BFD0F7;
}
```

### Ghost Button

데이터 출처, 조건 초기화, 비교 비우기 같은 보조 행동에 사용한다.

```css
.button-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
}
```

### 금지 규칙

한 화면 안에서 Primary 버튼을 3개 이상 남발하지 않는다.
특히 후보 카드마다 파란 버튼이 너무 많으면 화면이 복잡해지므로, 카드 내에서는 **비교 버튼만 primary**, 나머지는 secondary로 둔다.

---

## 10. Card Pattern

### 기본 카드

```txt
Card
├─ Meta / Badge
├─ Title
├─ Summary
├─ Key Info
└─ Actions
```

### 후보 카드

```txt
[지역]                         [당선/낙선/결과 미확인]
후보명

주요 공약
1. ...
2. ...
3. ...

[비교에 추가/비교 해제]
[후보 상세] [5대공약 보기] [선거공보 보기]
```

후보 카드에서는 분석 지표를 과하게 넣지 않는다.
현재 방향에서는 다음 정보만 남기는 게 좋다.

- 지역
- 당선 결과
- 후보명
- 주요 공약 3개
- 원문 이동 버튼

이 구성이 가장 깔끔하다.

---

## 11. Comparison Table Pattern

비교표는 검색 결과 위에 배치한다.

```txt
선택 후보 비교 2 / 4명                         [비교 비우기]

                김하늘              박도윤
                상세 | 5대공약 | 선거공보

지역            서울특별시          서울특별시
당선 결과        당선                낙선
주요 공약        3개 항목            3개 항목
```

### 비교표 규칙

| 규칙 | 설명 |
|---|---|
| 비교 후보 최대 | 4명 |
| 기본 표시 | 2명 선택 시 표시 |
| 모바일 표시 | 가로 스크롤 허용 |
| 행 개수 | 너무 많지 않게 3~6개 |
| 액션 | 후보명 아래에 작게 배치 |

모바일에서는 비교표를 억지로 줄이지 말고, 아래처럼 처리한다.

```css
.compare-table-wrapper {
  overflow-x: auto;
}
.compare-table {
  min-width: 680px;
}
```

---

## 12. Search Panel Pattern

검색 도구 화면에서는 검색 패널이 페이지의 핵심이다.

```txt
검색 패널
├─ 선거유형 Segmented Control
├─ 검색창
├─ 후보자 검색 버튼
├─ 상세 필터 버튼
├─ 적용 조건 Chip
└─ 조건 초기화
```

### 검색 패널 Desktop

한 줄에 검색창과 버튼을 배치한다.

```txt
[검색창----------------------] [후보자 검색] [상세 필터]
```

### 검색 패널 Mobile

세로로 배치한다.

```txt
[Segmented Control]
[검색창]
[후보자 검색]
[상세 필터]
[조건 chip]
[조건 초기화]
```

---

## 13. Chip / Badge Convention

### Filter Chip

```txt
서울  ×
```

- 배경: 연한 파랑 또는 연한 회색
- 텍스트: blue 또는 slate
- radius: 6px
- height: 28~32px

### Result Badge

| 상태 | 색 |
|---|---|
| 당선 | green soft |
| 낙선 | red soft |
| 결과 미확인 | gray soft |

```css
.badge-elected {
  background: var(--color-green-soft);
  color: #047857;
}

.badge-lost {
  background: var(--color-red-soft);
  color: #B91C1C;
}

.badge-unknown {
  background: #F1F5F9;
  color: #475569;
}
```

---

## 14. Dashboard Preview Pattern

랜딩 페이지의 오른쪽 대시보드 프리뷰는 실제 화면처럼 보여야 한다.

구성은 다음 정도가 적당하다.

```txt
Dashboard Preview
├─ 상단: 선거명 + 데이터 출처 버튼
├─ 탭: 공약 분석 / 후보 비교 / 당선 키워드
├─ 요약 지표 카드
├─ 도넛 차트
├─ 지역 지도 또는 분포 카드
└─ 하단 인사이트 CTA
```

주의할 점은 **프리뷰 안에 또 너무 많은 카드 중첩을 넣지 않는 것**이다.
큰 패널 하나 안에 작은 카드 4~5개 정도면 충분하다.

---

## 15. Mobile Landing Pattern

현재 세로 목업은 아래 구조가 가장 안정적이다.

```txt
Header
├─ Logo
└─ Menu Icon

Hero
├─ Source Label
├─ Main Title
├─ Description
├─ Primary Button full width
├─ Secondary Button full width
└─ Data Notice

Dashboard Preview
├─ Election Select
├─ Tabs
├─ Summary Stats
├─ Chart Cards
└─ Small CTA

Feature List
├─ List Item
├─ List Item
├─ List Item
└─ List Item

Insight Cards
├─ 2-column cards
└─ mobile에서는 1~2열

Notice Bar

Footer
```

모바일에서는 버튼을 가로로 억지 배치하지 않는다.
Primary / Secondary 버튼은 full width가 가장 안정적이다.

---

## 16. Page State Convention

### 1. 검색 전 상태

```txt
후보자 검색
검색 패널
데이터 범위 요약: 수록 후보 697명
안내 문구
```

후보 카드 목록과 비교표는 표시하지 않는다.

### 2. 검색 결과 있음 + 비교 꺼짐

```txt
검색 패널
검색 결과 요약
후보 카드 목록
Footer
```

모든 카드 버튼은 `비교에 추가`.

### 3. 검색 결과 있음 + 비교 켜짐

```txt
검색 패널
검색 결과 요약
선택 후보 비교 2 / 4명
후보 카드 목록
Footer
```

선택된 카드 버튼은 `비교 해제`.

### 4. 검색 결과 없음

```txt
검색 패널
검색 결과 없음
조건을 줄이거나 지역명을 다시 입력해보세요.
[조건 초기화]
```

---

## 17. 정보 위계 규칙

화면에서 가장 강해야 하는 순서는 다음이다.

```txt
1. 현재 페이지 제목
2. 검색창 / 주요 조작
3. 검색 결과 요약
4. 비교표
5. 후보 카드
6. 출처 / 주석
```

반대로 약하게 보여야 하는 정보는 다음이다.

```txt
- 데이터 출처
- 보조 설명
- footer 링크
- 조건 초기화
- 상세 필터
```

---

## 18. 금지 패턴

이 서비스에서는 아래 디자인은 피한다.

| 금지 요소 | 이유 |
|---|---|
| 과한 그라데이션 구 | 공공 데이터 서비스 신뢰감 저하 |
| stock 이미지 | 정책 분석 도구와 어울리지 않음 |
| 큰 일러스트 | 실제 데이터 탐색 기능이 약해 보임 |
| 카드 안 카드 중첩 | 정보 밀도 증가, 구현 복잡도 상승 |
| 파란 버튼 남발 | 모든 행동이 중요해 보여 위계 붕괴 |
| 분석 점수 과다 노출 | 정치적 편향처럼 보일 수 있음 |
| 후보 카드 내 정보 과밀 | 검색 결과 목록으로서 가독성 저하 |

---

## 19. 컴포넌트 네이밍 Convention

Next.js 기준으로 이렇게 나누면 깔끔하다.

```txt
components/
├─ layout/
│  ├─ AppHeader.tsx
│  ├─ AppFooter.tsx
│  └─ PageContainer.tsx
│
├─ common/
│  ├─ Button.tsx
│  ├─ Badge.tsx
│  ├─ Chip.tsx
│  ├─ SectionTitle.tsx
│  └─ Card.tsx
│
├─ search/
│  ├─ CandidateSearchPanel.tsx
│  ├─ SearchResultSummary.tsx
│  ├─ CandidateComparePanel.tsx
│  ├─ CandidateCompareTable.tsx
│  ├─ CandidateCard.tsx
│  └─ CandidateGrid.tsx
│
└─ landing/
   ├─ LandingHero.tsx
   ├─ DashboardPreview.tsx
   ├─ FeatureList.tsx
   └─ InsightCards.tsx
```

---

## 20. 최종 디자인 한 줄 정의

**정치한번 읽어볼까는 “공공데이터를 기반으로 후보자와 공약을 검색하고 비교하는 차분한 분석형 웹앱”이다.**

그래서 모든 화면은 다음 기준으로 판단한다.

```txt
예쁜가? 보다
정보를 신뢰할 수 있는가?

화려한가? 보다
후보와 공약을 빠르게 비교할 수 있는가?

랜딩처럼 보이는가? 보다
실제 시민이 사용할 검색 도구처럼 보이는가?
```

이 기준으로 가면 랜딩, 후보자 검색, 공약 상세, 후보 비교, 데이터 출처 화면까지 톤이 깨지지 않고 이어진다.
