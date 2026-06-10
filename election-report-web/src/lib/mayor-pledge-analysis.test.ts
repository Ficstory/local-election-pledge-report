import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";

import {
  MAYOR_CLIENT_KEYWORD_LIMIT,
  analyzeMayorPledges,
  classifyPolicyCategories,
  createKeywordStopwordSet,
  isMayorCandidate,
  normalizeKoreanKeyword,
  prepareMayorPledgeClientAnalysis,
  selectRepresentativeKeywords,
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
    expect(normalizeKoreanKeyword("만들겠습니다")).toBe("");
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
    const keywordText = keywords.join(" ");

    expect(analysis.pledgeItems).toHaveLength(1);
    expect(analysis.pledgeItems[0].keywordTokens).toEqual(
      expect.arrayContaining(["교통", "버스"])
    );
    expect(keywordText).not.toContain("지원");
    expect(keywordText).not.toContain("확대");
    expect(keywords).not.toContain("학교");
  });

  it("filters by region, district, party, candidate, and pledge text query", () => {
    const candidates = [
      makeCandidate({
        districtName: "강남구",
        id: "seoul-a",
        partyName: "가정당",
        pledges: [
          {
            id: "a-1",
            title: "청년 일자리",
            summary: "창업 공간을 늘립니다.",
            category: "경제",
            details: []
          },
          {
            id: "a-2",
            title: "청년 창업",
            summary: "창업 공간을 늘립니다.",
            category: "경제",
            details: []
          }
        ]
      }),
      makeCandidate({
        districtName: "영도구",
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

    const analysis = analyzeMayorPledges(
      candidates,
      {
        candidateId: "seoul-a",
        districtName: "강남구",
        partyName: "가정당",
        query: "창업",
        regionName: "서울특별시"
      },
      () => true
    );

    expect(analysis.candidates.map((candidate) => candidate.id)).toEqual([
      "seoul-a"
    ]);
    expect(analysis.pledgeItems.map((pledge) => pledge.id)).toEqual([
      "a-1",
      "a-2"
    ]);
    expect(
      analysis.keywords
        .map((keyword) => keyword.keyword)
        .some((keyword) => keyword.includes("창업"))
    ).toBe(true);
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
              title: "청년 일자리",
              summary: "청년 일자리 창출과 창업 공간",
              category: "경제",
              details: ["주거 안정"]
            },
            {
              id: "pledge-2",
              title: "청년 일자리",
              summary: "청년 일자리 창출과 창업 공간",
              category: "경제",
              details: ["주거 안정"]
            }
          ]
        })
      ],
      {}
    );

    expect(analysis.pledgeItems[0].keywordTokens).toEqual(
      expect.arrayContaining([
        "청년",
        "일자리",
        "창출",
        "창업",
        "공간"
      ])
    );
    expect(analysis.pledgeItems[0].keywords).toContain("청년 일자리");
    expect(analysis.keywords.map((keyword) => keyword.keyword)).toContain(
      "청년 일자리"
    );
    expect(analysis.candidateKeywords[0].keywords).toContain("청년 일자리");
  });

  it("removes administrative and template noise from policy phrases", () => {
    const analysis = analyzeMayorPledges(
      [
        makeCandidate({
          districtName: "부산광역시",
          id: "busan-mayor",
          officeType: "governor",
          officeName: "부산광역시장",
          regionName: "부산광역시",
          pledges: [
            {
              id: "pledge-1",
              title: "글로벌허브도시 특별법 인센티브",
              summary: "동백전 받은 부산 일반회계 이내 합산 부산찬스",
              category: "경제",
              details: [
                "부산시민 대상 글로벌허브도시 특별법 인센티브로 기업 유치"
              ]
            },
            {
              id: "pledge-2",
              title: "글로벌허브도시 특별법 인센티브",
              summary: "글로벌허브도시 특별법 인센티브로 기업 유치",
              category: "경제",
              details: []
            }
          ]
        })
      ],
      {}
    );
    const keywordText = analysis.keywords
      .map((keyword) => keyword.keyword)
      .join(" ");

    expect(keywordText).toContain("글로벌허브도시 특별법");
    expect(keywordText).not.toContain("받은 부산");
    expect(keywordText).not.toContain("일반회계 이내");
    expect(keywordText).not.toContain("합산 부산찬스");
    expect(keywordText).not.toContain("부산시민");
  });

  it("removes election-material formatting guidance from policy keywords", () => {
    const analysis = analyzeMayorPledges(
      [
        makeCandidate({
          districtName: "가평군",
          id: "guide-noise",
          officeName: "구·시·군의 장선거",
          pledges: Array.from({ length: 5 }, (_, index) => ({
            id: `pledge-${index + 1}`,
            title: "지역사회 통합돌봄",
            summary:
              "글씨체 글씨색 선택 가능 후보자 사진 홍보에 필요한 도표",
            category: "복지",
            details: ["지역사회 통합돌봄 체계를 구축합니다."]
          }))
        })
      ],
      {},
      () => true
    );
    const keywordText = analysis.keywords
      .map((keyword) => keyword.keyword)
      .join(" ");

    expect(keywordText).toContain("지역사회 통합돌봄");
    expect(keywordText).not.toContain("글씨체");
    expect(keywordText).not.toContain("글씨색");
    expect(keywordText).not.toContain("도표");
    expect(keywordText).not.toContain("후보자 사진");
  });

  it("does not promote one-off phrases as aggregate representative keywords", () => {
    const analysis = analyzeMayorPledges(
      [
        makeCandidate({
          id: "candidate-a",
          pledges: [
            {
              id: "a-1",
              title: "해양 관광",
              summary: "관광 거점을 정비합니다.",
              category: "문화",
              details: []
            }
          ]
        }),
        makeCandidate({
          id: "candidate-b",
          pledges: [
            {
              id: "b-1",
              title: "청년 창업",
              summary: "창업 공간을 늘립니다.",
              category: "경제",
              details: []
            }
          ]
        })
      ],
      {},
      () => true
    );

    expect(analysis.keywords).toEqual([]);
    expect(analysis.candidateKeywords).toHaveLength(2);
  });

  it("compacts mayor analysis before passing it to the client component", () => {
    const longText = "transit ".repeat(80).trim();
    const analysis = prepareMayorPledgeClientAnalysis({
      candidateKeywords: [],
      keywords: [
        {
          candidateCount: 2,
          count: 100,
          keyword: "transit",
          pledgeCount: 2
        },
        ...Array.from({ length: MAYOR_CLIENT_KEYWORD_LIMIT + 5 }, (_, index) => ({
          candidateCount: 2,
          count: 99 - index,
          keyword: `keyword-${index + 1}`,
          pledgeCount: 2
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

    expect(analysis.keywords).toHaveLength(MAYOR_CLIENT_KEYWORD_LIMIT);
    expect(analysis.pledgeItems[0].keywords).toEqual(["transit"]);
    expect(analysis.pledgeItems[0].pledgeText.length).toBeLessThanOrEqual(173);
  });

  it("keeps the most relevant representative keywords in the client payload", () => {
    const analysis = prepareMayorPledgeClientAnalysis({
      candidateKeywords: [],
      keywords: [
        ...Array.from({ length: MAYOR_CLIENT_KEYWORD_LIMIT }, (_, index) => ({
          candidateCount: 2,
          count: 34 - index,
          keyword: `keyword-${index + 1}`,
          pledgeCount: 34 - index,
          score: 100 - index
        })),
        {
          candidateCount: 2,
          count: 100,
          keyword: "late high-count keyword",
          pledgeCount: 100,
          score: 1
        }
      ],
      pledgeItems: [],
      policyCategories: []
    });

    expect(analysis.keywords).toHaveLength(MAYOR_CLIENT_KEYWORD_LIMIT);
    expect(analysis.keywords[0].keyword).toBe("keyword-1");
    expect(analysis.keywords.map((keyword) => keyword.keyword)).not.toContain(
      "late high-count keyword"
    );
  });

  it("collapses overlapping keyword phrase variants", () => {
    const representatives = selectRepresentativeKeywords([
      {
        candidateCount: 2,
        count: 2,
        keyword: "글로벌 허브",
        pledgeCount: 2,
        score: 8
      },
      {
        candidateCount: 2,
        count: 2,
        keyword: "글로벌허브도시 특별법",
        pledgeCount: 2,
        score: 8
      },
      {
        candidateCount: 2,
        count: 2,
        keyword: "글로벌허브도시 특별법 인센티브",
        pledgeCount: 2,
        score: 7
      },
      {
        candidateCount: 2,
        count: 2,
        keyword: "특별법 인센티브",
        pledgeCount: 2,
        score: 6
      },
      {
        candidateCount: 3,
        count: 4,
        keyword: "기업 유치",
        pledgeCount: 4,
        score: 9
      }
    ]);

    expect(representatives.map((keyword) => keyword.keyword)).toEqual([
      "기업 유치",
      "글로벌허브도시 특별법"
    ]);
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
