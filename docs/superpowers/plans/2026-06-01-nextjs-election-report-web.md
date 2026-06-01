# Next.js Election Report Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Next.js web app skeleton for collecting, browsing, and later analyzing local election candidates, pledges, and campaign materials.

**Architecture:** Keep the web app in `election-report-web/` so API data, scripts, and reports can live beside it later. Start with mock candidate data, typed domain models, tested summary/selectors, and static App Router pages for dashboard, candidate list, and candidate detail.

**Tech Stack:** Next.js App Router, React, TypeScript, plain CSS, Vitest for domain utility tests.

---

### File Structure

- Create `election-report-web/package.json`: scripts and dependencies.
- Create `election-report-web/src/types/election.ts`: candidate, pledge, and material analysis types.
- Create `election-report-web/src/data/mock-candidates.ts`: seed data shaped like future API output.
- Create `election-report-web/src/lib/election-stats.test.ts`: failing tests for summary and lookup utilities.
- Create `election-report-web/src/lib/election-stats.ts`: tested utility implementation.
- Create `election-report-web/src/app/page.tsx`: dashboard and candidate table.
- Create `election-report-web/src/app/candidates/[id]/page.tsx`: candidate detail page.
- Create `election-report-web/src/app/globals.css`: application styling.
- Create `election-report-web/README.md` and `election-report-web/.env.example`: setup notes and key placeholders.

### Tasks

- [ ] Scaffold Next.js config and package files.
- [ ] Add domain utility tests before implementation.
- [ ] Run tests and confirm the missing implementation failure.
- [ ] Implement candidate stats and lookup utilities.
- [ ] Build dashboard and candidate detail pages using mock data.
- [ ] Install dependencies.
- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Start the dev server and report the local URL.

### Self-Review

- No production API key is stored in files.
- Mock data uses Korean local-election labels and future-compatible IDs.
- The UI separates data model, utility logic, and pages.
- The first app version is intentionally local/static; API collection comes next.
