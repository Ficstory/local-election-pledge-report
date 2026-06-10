# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-06-10
- Primary product surfaces: landing page, candidate search and comparison, pledge analysis, education keyword analysis, candidate detail, source/material viewer links.
- Evidence reviewed:
  - `docs/design/2026-06-10-ui-design-convention.md`: user-provided UI design convention. This is the primary visual and UX reference.
  - `docs/roadmap/2026-06-10-candidate-search-screen-spec.md`: candidate search screen specification and acceptance criteria.
  - `election-report-web/src/app/globals.css`: current global CSS, tokens, responsive rules, cards, buttons, filters, comparison table, and keyword analysis styles.
  - `election-report-web/src/app/layout.tsx`: current global navigation and metadata.
  - `election-report-web/src/app/page.tsx`: current landing, election tabs, candidate search/list, comparison, and pledge-analysis routing surface.
  - `election-report-web/src/app/candidates/[id]/page.tsx`: current candidate detail layout and source/data panels.
  - `election-report-web/landing-desktop.png`, `election-report-web/landing-mobile.png`, `election-report-web/public/landing-wordcloud.png`: existing visual references.
- Application rule: for UI/frontend work, read this file first. If code and this document disagree, preserve working behavior but move the UI toward this contract. If a decision is still ambiguous, add an open question here before introducing a new pattern.

## Brand
- Personality: calm, exact, civic, public-data based, analysis-tool first.
- Trust signals: National Election Commission public data, clear source links, factual labels, restrained visual hierarchy, visible raw-material paths.
- Avoid: marketing-heavy persuasion, stock images, decorative gradient orbs, large generic illustrations, card-in-card nesting, too many primary buttons, and unverified political scoring.

## Product goals
- Goals: help citizens search candidates, compare pledges, inspect original election materials, and understand election-result or keyword patterns through public data.
- Non-goals: campaign promotion, ideological recommendation, decorative landing-page storytelling, or unverifiable candidate scoring.
- Success signals: users can find a candidate or region quickly, compare 2 to 4 candidates without confusion, open original pledge/material sources, and understand data limits.

## Personas and jobs
- Primary personas: voters checking local candidates, civic-data reviewers, journalists/researchers, and project maintainers validating election-material ingestion.
- User jobs: search by candidate or region, compare candidates and pledges, inspect source PDFs, review aggregate pledge/keyword patterns, and confirm data provenance.
- Key contexts of use: mobile pre-vote lookup, desktop research, repeated filtering, source verification, and slow or partial data availability.

## Information architecture
- Primary navigation: `후보자 검색`, `시·도지사 분석`, `교육감 분석`, `시·군·구청장 분석`. Keep `데이터 출처` out of the primary nav unless it becomes a dedicated screen.
- Core routes/screens: landing, executive pledge analysis, candidate search/comparison, education keyword analysis, candidate detail, material viewer route.
- Content hierarchy:
  1. Current page title.
  2. Search input or primary operation.
  3. Result summary and applied conditions.
  4. Candidate comparison.
  5. Candidate/result cards.
  6. Source notes, footers, and reset/filter helpers.

## Design principles
- Principle 1: Trust before decoration. Every screen should feel like a reliable public-data tool.
- Principle 2: Search and comparison before explanation. Users should reach candidate, pledge, and source content quickly.
- Principle 3: Show only defensible facts in candidate cards and comparison tables. Derived analysis needs a clear method before it becomes a primary UI signal.
- Tradeoffs: landing pages may introduce the service, but should still preview real analysis UI rather than rely on generic imagery. Dense data screens may use compact layouts, but not at the cost of scannability or mobile structure.

## Visual language
- Color: use the convention tokens in `election-report-web/src/app/globals.css`. Blue is reserved for primary actions, active states, selected candidates, and links. Green indicates elected/success, red indicates lost/warning, gray indicates inactive or unknown states.
- Typography: use `Pretendard, "Noto Sans KR", system-ui, sans-serif` style stacks. Keep Korean text readable with body line height around `1.6` and compact data text around `1.45`.
- Spacing/layout rhythm: use an 8px-based spacing scale. Keep section gaps around `64px` to `96px`; cards around `18px` to `32px` padding depending on viewport.
- Shape/radius/elevation: buttons and inputs use `6px` to `8px` radius. Data cards stay at `8px` or less. Large preview panels may use `16px`, with soft shadows only.
- Motion: minimal and functional. Prefer focus, hover, selected, loading, and disclosure transitions over decorative animation.
- Imagery/iconography: prefer real data previews, charts, tables, source/material thumbnails, or existing app screenshots. Avoid stock photos and decorative illustrations.

## Components
- Existing components to reuse: `SiteNavbar`, `ElectionTypeTabs`, `MayorPledgeAnalysis`, candidate cards, `action-button`, `panel`, `filter-form`, `compare-table`, status chips, `CandidateMaterials`, and `CandidateSourceInfo`.
- New/changed components: candidate search page components should follow `CandidateSearchForm`, `CandidateSearchSummary`, `CandidateCompareTray/Table`, `CandidateResultCard`, `CandidateSearchEmptyState`, and footer/source components from the search spec.
- Variants and states: buttons need primary, secondary, ghost/tertiary, disabled, hover, and focus-visible states. Badges need elected, lost, and unknown variants. Search/result views need pre-search, loading, results, no-results, compare-one, compare-two-to-four, error, and disabled states.
- Token/component ownership: global design tokens live in `election-report-web/src/app/globals.css`. Do not add a separate styling framework unless the app adopts one broadly.

## Accessibility
- Target standard: WCAG 2.2 AA for contrast, keyboard access, focus visibility, and semantic structure.
- Keyboard/focus behavior: all links, buttons, filters, disclosure controls, tabs, and comparison actions must be reachable and visibly focused.
- Contrast/readability: body text, muted text, badges, chips, and chart labels must remain legible on the soft background palette.
- Screen-reader semantics: search forms use clear labels and `role="search"` where appropriate. Result counts should be announced via status text. Comparison tables need proper row and column headers.
- Reduced motion and sensory considerations: avoid required animation. Any motion should be nonessential and respect reduced-motion preferences when added.

## Responsive behavior
- Supported breakpoints/devices:
  - Mobile: `360px` to `767px`, one-column layout, full-width cards and primary actions.
  - Tablet: `768px` to `1023px`, one-column first, limited two-column cards where useful.
  - Desktop: `1024px` to `1439px`, two-column analysis/search layouts and card grids.
  - Wide desktop: `1440px+`, fixed max container width.
- Layout adaptations: desktop may use left text/right data preview at roughly `40/60`. Tablet and mobile stack as text, action, data, then supporting sections.
- Touch/hover differences: mobile filters and comparison should not rely on hover. Comparison tables may scroll horizontally instead of being squeezed.

## Interaction states
- Loading: show a compact skeleton or clear loading copy near the result area, not a full-screen interruption.
- Empty: pre-search state should focus on the search panel and data range. No-results state should explain how to relax conditions and offer reset.
- Error: explain what failed, keep existing search input state, and provide a retry or safe destination.
- Success: result summaries should show counts and applied conditions.
- Disabled: disabled actions must explain why where possible, especially max 4 candidate comparison.
- Offline/slow network, if applicable: keep source/data limitation copy factual and avoid implying analysis completeness.

## Content voice
- Tone: factual, concise, and neutral.
- Terminology: use `후보자`, `공약`, `선거공보`, `5대공약`, `당선`, `낙선`, `결과 확인중`, `중앙선거관리위원회 공개데이터`.
- Microcopy rules: do not over-explain UI mechanics in visible text. State data limits plainly. Avoid labels that imply political judgment without a verified method.

## Implementation constraints
- Framework/styling system: Next.js App Router, React, TypeScript, global CSS. No Tailwind or component library is currently established.
- Design-token constraints: use `--color-*`, `--space-*`, `--radius-*`, `--line-height-*`, and existing semantic aliases in `globals.css`.
- Performance constraints: pages render public election data and analysis summaries; avoid client-only UI if server-rendered links/forms are sufficient.
- Compatibility constraints: Korean text must stay UTF-8. On Windows, inspect Korean files with `Get-Content -Encoding UTF8`.
- Test/screenshot expectations: meaningful UI changes should be checked at mobile and desktop widths. Preserve existing test behavior unless the related feature is intentionally changed.

## Open questions
- [x] `후보자 검색` now uses `/candidates/search`. Owner: product/engineering. Impact: IA and URL compatibility.
- [ ] Should the current horizontal mobile nav become a hamburger drawer/full-screen sheet? Owner: design/engineering. Impact: mobile navigation consistency.
- [ ] Should candidate cards remove derived fields such as orientation, policy axis, criminal-record status, and pledge/material availability to match the 2026-06-10 search spec? Owner: product. Impact: trust, density, and current feature scope.
- [ ] What footer/source component should replace `데이터 출처` in primary nav? Owner: product/design. Impact: global navigation and source discoverability.
