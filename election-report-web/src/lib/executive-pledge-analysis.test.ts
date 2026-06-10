import { describe, expect, it } from "vitest";

import type { Candidate } from "../types/election";
import {
  buildExecutivePledgeAnalysis,
  serializeExecutivePledgeAnalysis,
  type ExecutivePledgeCandidate
} from "./executive-pledge-analysis";

function makeCandidate(
  overrides: Partial<ExecutivePledgeCandidate> &
    Pick<ExecutivePledgeCandidate, "id" | "pledges" | "sgTypecode">
): ExecutivePledgeCandidate {
  const { id, pledges, sgTypecode, ...rest } = overrides;

  return {
    age: 50,
    ballotNumber: "1",
    candidateName: `Candidate ${id}`,
    careers: [],
    districtName: sgTypecode === "4" ? "Sample District" : undefined,
    education: "",
    electionId: "20260603",
    electionName: "Local Election",
    gender: "" as Candidate["gender"],
    id,
    job: "",
    material: {
      dominantColors: [],
      fontNotes: "",
      layoutNotes: "",
      status: "pending"
    },
    officeName: sgTypecode === "3" ? "Governor" : "Municipal Mayor",
    officeType: sgTypecode === "3" ? "governor" : "municipal_mayor",
    partyName: "Sample Party",
    pledges,
    regionName: "Sample Region",
    sgTypecode,
    source: {},
    status: "registered",
    ...rest
  };
}

describe("executive pledge analysis", () => {
  it("filters analysis to sgTypecode 3 and 4 candidates", () => {
    const analysis = buildExecutivePledgeAnalysis([
      makeCandidate({
        electionResult: {
          elected: true,
          voteCount: 100,
          voteRate: 55.1
        },
        id: "regional",
        pledges: [
          {
            category: "",
            details: [],
            id: "regional-pledge",
            summary: "",
            title: "transit"
          }
        ],
        sgTypecode: "3"
      }),
      makeCandidate({
        electionResult: {
          elected: false,
          voteCount: 80,
          voteRate: 44.9
        },
        id: "local",
        pledges: [
          {
            category: "",
            details: [],
            id: "local-pledge",
            summary: "",
            title: "housing"
          }
        ],
        sgTypecode: "4"
      }),
      makeCandidate({
        id: "education",
        pledges: [
          {
            category: "",
            details: [],
            id: "education-pledge",
            summary: "",
            title: "school"
          }
        ],
        sgTypecode: "11"
      })
    ]);

    expect(analysis.summary.counts.candidateCount).toBe(2);
    expect(analysis.summary.counts.bySgTypecode["3"].candidateCount).toBe(1);
    expect(analysis.summary.counts.bySgTypecode["4"].candidateCount).toBe(1);
    expect(
      analysis.candidateKeywordSummaryRows.map((candidate) => candidate.candidateId)
    ).toEqual(["regional", "local"]);
  });

  it("separates elected and non-elected groups while aggregating keywords", () => {
    const analysis = buildExecutivePledgeAnalysis([
      makeCandidate({
        electionResult: {
          elected: true,
          voteCount: 1200,
          voteRate: 60.5
        },
        id: "winner",
        pledges: [
          {
            category: "",
            details: ["housing"],
            id: "winner-pledge",
            summary: "transit",
            title: "transit"
          }
        ],
        sgTypecode: "3"
      }),
      makeCandidate({
        electionResult: {
          elected: false,
          voteCount: 800,
          voteRate: 39.5
        },
        id: "runner-up",
        pledges: [
          {
            category: "",
            details: [],
            id: "runner-up-pledge",
            summary: "jobs",
            title: "housing"
          }
        ],
        sgTypecode: "3"
      })
    ]);
    const transit = analysis.keywordFrequencyRows.find(
      (row) => row.keyword === "transit"
    );
    const comparison = analysis.electedVsNonElectedKeywordRows.find(
      (row) => row.keyword.includes("transit")
    );

    expect(analysis.summary.counts.electedCandidateCount).toBe(1);
    expect(analysis.summary.counts.nonElectedCandidateCount).toBe(1);
    expect(transit).toMatchObject({
      count: 2,
      electedCount: 2,
      nonElectedCount: 0
    });
    expect(comparison).toMatchObject({
      moreObservedIn: "elected"
    });
  });

  it("adds candidate result fields and top keywords to candidate summaries", () => {
    const analysis = buildExecutivePledgeAnalysis([
      makeCandidate({
        electionResult: {
          elected: true,
          rank: 1,
          voteCount: 777,
          voteRate: 51.23
        },
        id: "candidate",
        pledges: [
          {
            category: "",
            details: [],
            id: "pledge",
            summary: "jobs",
            title: "jobs transit"
          }
        ],
        sgTypecode: "4"
      })
    ]);

    expect(analysis.candidateKeywordSummaryRows[0]).toMatchObject({
      elected: true,
      pledgeCount: 1,
      resultStatus: "elected",
      sgTypecode: "4",
      voteCount: 777,
      voteRate: 51.23
    });
    expect(analysis.candidateKeywordSummaryRows[0].topKeywords).toContain(
      "jobs transit"
    );
  });

  it("extracts scored policy phrases separately from word frequency", () => {
    const analysis = buildExecutivePledgeAnalysis([
      makeCandidate({
        electionResult: {
          elected: true,
          voteCount: 100,
          voteRate: 55
        },
        id: "winner",
        pledges: [
          {
            category: "",
            details: ["goal execution period transit expansion"],
            id: "pledge",
            summary: "transit expansion",
            title: "transit expansion"
          }
        ],
        sgTypecode: "3"
      })
    ]);

    expect(analysis.keywordFrequencyRows.map((row) => row.keyword)).toContain(
      "transit"
    );
    expect(analysis.phraseFrequencyRows.map((row) => row.keyword)).toContain(
      "transit expansion"
    );
    expect(analysis.phraseFrequencyRows[0].score).toBeGreaterThan(0);
  });

  it("serializes the required CSV files and summary structure", () => {
    const analysis = buildExecutivePledgeAnalysis(
      [
        makeCandidate({
          electionResult: {
            elected: false,
            voteCount: 10,
            voteRate: 12.3
          },
          id: "candidate",
          pledges: [
            {
              category: "",
              details: [],
              id: "pledge",
              summary: "",
              title: "housing"
            }
          ],
          sgTypecode: "4"
        })
      ],
      {
        generatedAt: "2026-06-09T00:00:00.000Z"
      }
    );
    const serialized = serializeExecutivePledgeAnalysis(analysis);
    const summary = JSON.parse(serialized.summaryJson);

    expect(serialized.keywordFrequencyCsv.split("\n")[0]).toBe(
      "keyword,count,pledgeCount,candidateCount,candidateRate,countPerCandidate,score,electedCount,electedPledgeCount,electedCandidateCount,nonElectedCount,nonElectedPledgeCount,nonElectedCandidateCount"
    );
    expect(serialized.phraseFrequencyCsv.split("\n")[0]).toBe(
      "keyword,count,pledgeCount,candidateCount,candidateRate,countPerCandidate,score,electedCount,electedPledgeCount,electedCandidateCount,nonElectedCount,nonElectedPledgeCount,nonElectedCandidateCount"
    );
    expect(serialized.policyCategorySummaryCsv.split("\n")[0]).toBe(
      "category,count,electedCount,nonElectedCount,topKeywords,electedKeywords,nonElectedKeywords"
    );
    expect(serialized.electedVsNonElectedKeywordsCsv.split("\n")[0]).toContain(
      "moreObservedIn"
    );
    expect(serialized.candidateKeywordSummaryCsv.split("\n")[0]).toContain(
      "candidateId,sgTypecode"
    );
    expect(summary.outputs).toMatchObject({
      candidateKeywordSummaryCsv: "candidate-keyword-summary.csv",
      electedVsNonElectedKeywordsCsv: "elected-vs-non-elected-keywords.csv",
      keywordFrequencyCsv: "keyword-frequency.csv",
      phraseFrequencyCsv: "phrase-frequency.csv",
      policyCategorySummaryCsv: "policy-category-summary.csv",
      summaryJson: "summary.json"
    });
    expect(summary.limitations.join(" ")).toContain("당선 원인 해석");
    expect(summary.analysisCriteria.tokenization).toContain("토큰/규칙 기반");
  });
});
