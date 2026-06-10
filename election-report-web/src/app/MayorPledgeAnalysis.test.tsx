import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MayorPledgeAnalysis } from "./MayorPledgeAnalysis";
import type { MayorKeyword, MayorPledgeItem } from "../lib/mayor-pledge-analysis";

function makeKeyword(
  index: number,
  overrides: Partial<MayorKeyword> = {}
): MayorKeyword {
  return {
    candidateCount: index,
    count: 100 - index,
    keyword: `keyword-${index}`,
    pledgeCount: 50 - index,
    ...overrides
  };
}

function makePledge(index = 1): MayorPledgeItem {
  return {
    candidateId: `candidate-${index}`,
    candidateName: `Candidate ${index}`,
    electionName: "Election",
    id: `pledge-${index}`,
    keywords: ["keyword"],
    partyName: "Party",
    pledgeSummary: "Summary",
    pledgeText: "keyword pledge text",
    pledgeTitle: `Pledge ${index}`,
    regionName: "Region"
  };
}

describe("MayorPledgeAnalysis", () => {
  it("renders a lightweight loading state when analysis is deferred", () => {
    const markup = renderToStaticMarkup(
      <MayorPledgeAnalysis
        analysisUrl="/api/executive-analysis?election=local-executive"
        filters={{}}
        options={{ candidates: [], parties: [], regions: [] }}
      />
    );

    expect(markup).toContain('data-analysis-state="loading"');
    expect(markup).not.toContain("mayor-pledge-row");
    expect(markup).not.toContain("keyword-rank-row");
  });

  it("limits the ranked keyword panel to the top 10 keywords", () => {
    const markup = renderToStaticMarkup(
      <MayorPledgeAnalysis
        analysis={{
          candidateKeywords: [],
          keywords: Array.from({ length: 12 }, (_, index) => makeKeyword(index + 1)),
          pledgeItems: [makePledge()],
          policyCategories: []
        }}
        filters={{}}
        options={{ candidates: [], parties: [], regions: [] }}
      />
    );

    expect(markup).toContain("TOP 10");
    expect(markup.match(/keyword-rank-row/g)).toHaveLength(10);
  });

  it("orders the ranked keyword panel by pledge count and shows that metric", () => {
    const markup = renderToStaticMarkup(
      <MayorPledgeAnalysis
        analysis={{
          candidateKeywords: [],
          keywords: [
            makeKeyword(1, {
              count: 69,
              keyword: "민간 자본",
              pledgeCount: 69
            }),
            makeKeyword(2, {
              count: 275,
              keyword: "일자리 창출",
              pledgeCount: 275
            }),
            makeKeyword(3, {
              count: 100,
              keyword: "양질 일자리",
              pledgeCount: 100
            })
          ],
          pledgeItems: [makePledge()],
          policyCategories: []
        }}
        filters={{}}
        options={{ candidates: [], parties: [], regions: [] }}
      />
    );

    expect(markup.indexOf("일자리 창출")).toBeLessThan(
      markup.indexOf("양질 일자리")
    );
    expect(markup.indexOf("양질 일자리")).toBeLessThan(
      markup.indexOf("민간 자본")
    );
    expect(markup).toContain("100개 공약");
    expect(markup).not.toContain("100회");
  });

  it("shows pledge results in groups of 5", () => {
    const markup = renderToStaticMarkup(
      <MayorPledgeAnalysis
        analysis={{
          candidateKeywords: [],
          keywords: [makeKeyword(1)],
          pledgeItems: Array.from({ length: 7 }, (_, index) => makePledge(index + 1)),
          policyCategories: []
        }}
        filters={{}}
        options={{ candidates: [], parties: [], regions: [] }}
      />
    );

    expect(markup.match(/mayor-pledge-row/g)).toHaveLength(5);
    expect(markup).toMatch(/5\s*\/\s*7/);
  });

  it("renders executive tab-specific copy and form state", () => {
    const markup = renderToStaticMarkup(
      <MayorPledgeAnalysis
        analysis={{
          candidateKeywords: [],
          keywords: [],
          pledgeItems: [],
          policyCategories: []
        }}
        copy={{
          emptyDescription: "지역이나 후보자 조건을 변경해보세요.",
          emptyTitle: "조건에 맞는 시·군·구청장 후보 공약이 없습니다.",
          eyebrow: "시·군·구청장 후보 공약",
          filterDescription:
            "후보자를 선택하지 않으면 조건에 맞는 전체 시·군·구청장 후보 공약을 합산합니다.",
          lead: "지역별 시·군·구청장 후보자의 주요 공약 키워드와 원문을 확인하세요.",
          title: "시·군·구청장 공약 분석"
        }}
        electionValue="local-executive"
        filters={{ regionName: "서울특별시" }}
        options={{ candidates: [], parties: [], regions: ["서울특별시"] }}
      />
    );

    expect(markup).toContain("시·군·구청장 공약 분석");
    expect(markup).toMatch(
      /<input[^>]*name="election"[^>]*value="local-executive"/
    );
    expect(markup).toContain('href="/?election=local-executive"');
    expect(markup).toContain("조건에 맞는 시·군·구청장 후보 공약이 없습니다.");
  });
});
