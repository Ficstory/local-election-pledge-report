import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  filteredMayorCandidateOptions,
  mayorDistrictOptionsForFilters,
  mayorDistrictOptionsForRegion,
  MayorPledgeAnalysis,
  mayorPartyOptionsForFilters,
  mayorPartyOptionsForRegion,
  mayorRegionOptionsForFilters,
  type CandidateOption
} from "./MayorPledgeAnalysis";
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

const regionalCandidateOptions: CandidateOption[] = [
  {
    districtName: "수원시",
    id: "gyeonggi-reform",
    label: "경기개혁 후보 (경기도)",
    partyName: "개혁신당",
    regionName: "경기도"
  },
  {
    districtName: "성남시",
    id: "gyeonggi-power",
    label: "경기보수 후보 (경기도)",
    partyName: "국민의힘",
    regionName: "경기도"
  },
  {
    districtName: "강서구",
    id: "busan-future",
    label: "부산미래 후보 (부산광역시 강서구)",
    partyName: "미래정당",
    regionName: "부산광역시"
  },
  {
    districtName: "영도구",
    id: "busan-reform",
    label: "부산개혁 후보 (부산광역시 영도구)",
    partyName: "개혁신당",
    regionName: "부산광역시"
  },
  {
    districtName: "종로구",
    id: "seoul-future",
    label: "서울미래 후보 (서울특별시)",
    partyName: "미래정당",
    regionName: "서울특별시"
  }
];

describe("MayorPledgeAnalysis", () => {
  it("renders a lightweight loading state when analysis is deferred", () => {
    const markup = renderToStaticMarkup(
      <MayorPledgeAnalysis
        analysisUrl="/api/executive-analysis?election=local-executive"
        filters={{}}
        options={{ candidates: [], districts: [], parties: [], regions: [] }}
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
        options={{ candidates: [], districts: [], parties: [], regions: [] }}
      />
    );

    expect(markup).toContain("TOP 10");
    expect(markup.match(/keyword-rank-row/g)).toHaveLength(10);
  });

  it("orders the ranked keyword panel by relevance and shows coverage evidence", () => {
    const markup = renderToStaticMarkup(
      <MayorPledgeAnalysis
        analysis={{
          candidateKeywords: [],
          keywords: [
            makeKeyword(1, {
              count: 69,
              keyword: "민간 자본",
              pledgeCount: 69,
              score: 8
            }),
            makeKeyword(2, {
              count: 275,
              keyword: "일자리 창출",
              pledgeCount: 275,
              score: 7
            }),
            makeKeyword(3, {
              count: 100,
              keyword: "양질 일자리",
              pledgeCount: 100,
              score: 9
            })
          ],
          pledgeItems: [makePledge()],
          policyCategories: []
        }}
        filters={{}}
        options={{ candidates: [], districts: [], parties: [], regions: [] }}
      />
    );

    expect(markup.indexOf("양질 일자리")).toBeLessThan(
      markup.indexOf("민간 자본")
    );
    expect(markup.indexOf("민간 자본")).toBeLessThan(
      markup.indexOf("일자리 창출")
    );
    expect(markup).toContain("3명 후보 · 100개 공약");
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
        options={{ candidates: [], districts: [], parties: [], regions: [] }}
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
        options={{
          candidates: [],
          districts: [],
          parties: [],
          regions: ["서울특별시"]
        }}
      />
    );

    expect(markup).toContain("시·군·구청장 공약 분석");
    expect(markup).toMatch(
      /<input[^>]*name="election"[^>]*value="local-executive"/
    );
    expect(markup).toContain('href="/?election=local-executive"');
    expect(markup).toContain("조건에 맞는 시·군·구청장 후보 공약이 없습니다.");
  });

  it("narrows party and candidate options from selected region and party", () => {
    expect(mayorPartyOptionsForRegion(regionalCandidateOptions, "경기도")).toEqual([
      "개혁신당",
      "국민의힘"
    ]);
    expect(
      filteredMayorCandidateOptions(regionalCandidateOptions, {
        partyName: "개혁신당",
        regionName: "경기도"
      }).map((candidate) => candidate.id)
    ).toEqual(["gyeonggi-reform"]);

    const markup = renderToStaticMarkup(
      <MayorPledgeAnalysis
        analysis={{
          candidateKeywords: [],
          keywords: [],
          pledgeItems: [],
          policyCategories: []
        }}
        filters={{
          partyName: "개혁신당",
          regionName: "경기도"
        }}
        options={{
          candidates: regionalCandidateOptions,
          districts: ["강서구", "성남시", "수원시", "영도구", "종로구"],
          parties: ["개혁신당", "국민의힘", "미래정당"],
          regions: ["경기도", "부산광역시", "서울특별시"]
        }}
      />
    );

    expect(markup).toContain("경기개혁 후보");
    expect(markup).not.toContain("경기보수 후보");
    expect(markup).not.toContain("서울미래 후보");
    expect(markup).not.toContain("미래정당");
  });

  it("shows a district filter only for local executives", () => {
    expect(
      mayorDistrictOptionsForRegion(regionalCandidateOptions, "부산광역시")
    ).toEqual(["강서구", "영도구"]);
    expect(
      filteredMayorCandidateOptions(regionalCandidateOptions, {
        districtName: "강서구",
        regionName: "부산광역시"
      }).map((candidate) => candidate.id)
    ).toEqual(["busan-future"]);

    const localMarkup = renderToStaticMarkup(
      <MayorPledgeAnalysis
        analysis={{
          candidateKeywords: [],
          keywords: [],
          pledgeItems: [],
          policyCategories: []
        }}
        electionValue="local-executive"
        filters={{
          districtName: "강서구",
          regionName: "부산광역시"
        }}
        options={{
          candidates: regionalCandidateOptions,
          districts: ["강서구", "성남시", "수원시", "영도구", "종로구"],
          parties: ["개혁신당", "국민의힘", "미래정당"],
          regions: ["경기도", "부산광역시", "서울특별시"]
        }}
      />
    );

    expect(localMarkup).toContain("세부지역 선택");
    expect(localMarkup).toContain("강서구");
    expect(localMarkup).toContain("부산미래 후보");
    expect(localMarkup).not.toContain("부산개혁 후보");

    const regionalMarkup = renderToStaticMarkup(
      <MayorPledgeAnalysis
        analysis={{
          candidateKeywords: [],
          keywords: [],
          pledgeItems: [],
          policyCategories: []
        }}
        electionValue="regional-executive"
        filters={{
          regionName: "부산광역시"
        }}
        options={{
          candidates: regionalCandidateOptions,
          districts: ["강서구", "영도구"],
          parties: ["개혁신당", "미래정당"],
          regions: ["부산광역시"]
        }}
      />
    );

    expect(regionalMarkup).not.toContain("세부지역 선택");
  });

  it("narrows region, district, and party options from a selected candidate", () => {
    expect(
      mayorRegionOptionsForFilters(regionalCandidateOptions, {
        candidateId: "busan-reform"
      })
    ).toEqual(["부산광역시"]);
    expect(
      mayorDistrictOptionsForFilters(regionalCandidateOptions, {
        candidateId: "busan-reform",
        regionName: "부산광역시"
      })
    ).toEqual(["영도구"]);
    expect(
      mayorPartyOptionsForFilters(regionalCandidateOptions, {
        candidateId: "busan-reform",
        districtName: "영도구",
        regionName: "부산광역시"
      })
    ).toEqual(["개혁신당"]);

    const markup = renderToStaticMarkup(
      <MayorPledgeAnalysis
        analysis={{
          candidateKeywords: [],
          keywords: [],
          pledgeItems: [],
          policyCategories: []
        }}
        electionValue="local-executive"
        filters={{
          candidateId: "busan-reform"
        }}
        options={{
          candidates: regionalCandidateOptions,
          districts: ["강서구", "성남시", "수원시", "영도구", "종로구"],
          parties: ["개혁신당", "국민의힘", "미래정당"],
          regions: ["경기도", "부산광역시", "서울특별시"]
        }}
      />
    );

    expect(markup).toContain("부산광역시");
    expect(markup).toContain("영도구");
    expect(markup).toContain("개혁신당");
    expect(markup).toContain("부산개혁 후보");
    expect(markup).not.toContain("경기도");
    expect(markup).not.toContain("서울특별시");
    expect(markup).not.toContain("강서구");
    expect(markup).not.toContain("국민의힘");
    expect(markup).not.toContain("미래정당");
    expect(markup).not.toContain("부산미래 후보");
  });
});
