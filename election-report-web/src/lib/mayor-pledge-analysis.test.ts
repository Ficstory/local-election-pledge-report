import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";

import {
  analyzeMayorPledges,
  classifyPolicyCategories,
  createKeywordStopwordSet,
  isMayorCandidate,
  normalizeKoreanKeyword,
  prepareMayorPledgeClientAnalysis,
  tokenizePledgeText
} from "./mayor-pledge-analysis";
import type { Candidate } from "../types/election";

function makeCandidate(
  overrides: Partial<Candidate> & Pick<Candidate, "id" | "pledges">
): Candidate {
  const { id, pledges, ...rest } = overrides;

  return {
    id,
    electionId: "20260603",
    electionName: "2026 전국동시지방선거",
    officeType: "municipal_mayor",
    officeName: "서울특별시장",
    regionName: "서울특별시",
    partyName: "테스트정당",
    candidateName: "김테스트",
    ballotNumber: "1",
    status: "registered",
    age: 50,
    gender: "남",
    job: "정치인",
    education: "대학교 졸업",
    careers: [],
    pledges,
    material: {
      status: "pending",
      dominantColors: [],
      fontNotes: "",
      layoutNotes: ""
    },
    source: {},
    ...rest
  };
}

describe("mayor pledge analysis", () => {
  it("separates mayor candidates from district heads and county heads", () => {
    expect(
      isMayorCandidate(
        makeCandidate({
          id: "real-city-mayor",
          officeName: "구·시·군의 장선거",
          districtName: "수원시",
          pledges: []
        })
      )
    ).toBe(true);
    expect(
      isMayorCandidate(
        makeCandidate({
          id: "real-county-head",
          officeName: "구·시·군의 장선거",
          districtName: "고성군",
          pledges: []
        })
      )
    ).toBe(false);
    expect(
      isMayorCandidate(
        makeCandidate({
          id: "real-district-head",
          officeName: "구·시·군의 장선거",
          districtName: "강남구",
          pledges: []
        })
      )
    ).toBe(false);
    expect(
      isMayorCandidate(
        makeCandidate({
          id: "metro-mayor",
          officeType: "governor",
          officeName: "부산광역시장",
          pledges: []
        })
      )
    ).toBe(true);
    expect(
      isMayorCandidate(
        makeCandidate({
          id: "city-mayor",
          officeName: "수원시장",
          pledges: []
        })
      )
    ).toBe(true);
    expect(
      isMayorCandidate(
        makeCandidate({
          id: "district-head",
          officeName: "강남구청장",
          pledges: []
        })
      )
    ).toBe(false);
  });

  it("normalizes Korean particles and removes configurable stopwords", () => {
    expect(normalizeKoreanKeyword("시민에게")).toBe("시민");
    expect(normalizeKoreanKeyword("지역의")).toBe("지역");
    expect(tokenizePledgeText("시민에게 교통 지원 확대 및 주차 개선")).toEqual([
      "교통",
      "주차"
    ]);
  });

  it("analyzes only municipal mayor pledges and excludes common pledge words", () => {
    const candidates = [
      makeCandidate({
        id: "mayor-1",
        pledges: [
          {
            id: "pledge-1",
            title: "교통 지원 확대",
            summary: "버스 환승과 주차 문제를 해결합니다.",
            category: "교통",
            details: ["도로 정비", "환승센터 개선"]
          }
        ]
      }),
      makeCandidate({
        id: "education-1",
        officeType: "education_superintendent",
        pledges: [
          {
            id: "pledge-2",
            title: "학교 교육",
            summary: "교육 지원",
            category: "교육",
            details: []
          }
        ]
      })
    ];

    const analysis = analyzeMayorPledges(candidates, {});
    const keywords = analysis.keywords.map((keyword) => keyword.keyword);

    expect(analysis.pledgeItems).toHaveLength(1);
    expect(keywords).toContain("교통");
    expect(keywords).toContain("버스");
    expect(keywords).not.toContain("지원");
    expect(keywords).not.toContain("확대");
    expect(keywords).not.toContain("학교");
  });

  it("filters by region, party, candidate, and pledge text query", () => {
    const candidates = [
      makeCandidate({
        id: "seoul-a",
        partyName: "가정당",
        pledges: [
          {
            id: "a-1",
            title: "청년 일자리",
            summary: "창업 공간을 늘립니다.",
            category: "경제",
            details: []
          }
        ]
      }),
      makeCandidate({
        id: "busan-b",
        partyName: "나정당",
        regionName: "부산광역시",
        pledges: [
          {
            id: "b-1",
            title: "해양 관광",
            summary: "관광 거점을 정비합니다.",
            category: "문화",
            details: []
          }
        ]
      })
    ];

    const analysis = analyzeMayorPledges(candidates, {
      candidateId: "seoul-a",
      partyName: "가정당",
      query: "창업",
      regionName: "서울특별시"
    });

    expect(analysis.candidates.map((candidate) => candidate.id)).toEqual([
      "seoul-a"
    ]);
    expect(analysis.pledgeItems.map((pledge) => pledge.id)).toEqual(["a-1"]);
    expect(analysis.keywords.map((keyword) => keyword.keyword)).toContain("창업");
  });

  it("reuses a pre-normalized stopword set during tokenization", () => {
    const stopwords = createKeywordStopwordSet(["candidate custom"]);

    expect(tokenizePledgeText("candidate custom transit housing", stopwords)).toEqual([
      "transit",
      "housing"
    ]);
  });

  it("stores pledge keywords so aggregate and candidate summaries reuse tokenization", () => {
    const analysis = analyzeMayorPledges(
      [
        makeCandidate({
          id: "mayor-1",
          pledges: [
            {
              id: "pledge-1",
              title: "green transit",
              summary: "green transit transit",
              category: "transport",
              details: ["housing support"]
            }
          ]
        })
      ],
      {}
    );

    expect(analysis.pledgeItems[0].keywords).toEqual([
      "green",
      "transit",
      "housing",
      "support"
    ]);
    expect(analysis.keywords.map((keyword) => keyword.keyword)).toContain("transit");
    expect(analysis.candidateKeywords[0].keywords).toContain("transit");
  });

  it("compacts mayor analysis before passing it to the client component", () => {
    const longText = "transit ".repeat(80).trim();
    const analysis = prepareMayorPledgeClientAnalysis({
      candidateKeywords: [],
      keywords: [
        {
          candidateCount: 1,
          count: 100,
          keyword: "transit",
          pledgeCount: 1
        },
        ...Array.from({ length: 39 }, (_, index) => ({
          candidateCount: 1,
          count: 99 - index,
          keyword: `keyword-${index + 1}`,
          pledgeCount: 1
        }))
      ],
      pledgeItems: [
        {
          candidateId: "candidate-1",
          candidateName: "Candidate",
          electionName: "Election",
          id: "pledge-1",
          keywords: ["transit", "background"],
          partyName: "Party",
          pledgeSummary: "",
          pledgeText: longText,
          pledgeTitle: "Long pledge",
          regionName: "Region"
        }
      ],
      policyCategories: []
    });

    expect(analysis.keywords).toHaveLength(34);
    expect(analysis.pledgeItems[0].keywords).toEqual(["transit"]);
    expect(analysis.pledgeItems[0].pledgeText.length).toBeLessThanOrEqual(173);
  });

  it("classifies policy categories without per-keyword rule normalization", () => {
    const keywords = Array.from({ length: 8000 }, (_, index) => ({
      candidateCount: 1,
      count: 8000 - index,
      keyword: `keyword-${index}`,
      pledgeCount: 1
    }));
    const start = performance.now();

    classifyPolicyCategories(keywords);

    expect(performance.now() - start).toBeLessThan(800);
  });
});
