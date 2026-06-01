import { describe, expect, it } from "vitest";

import { mockCandidates } from "../data/mock-candidates";
import {
  getCandidateById,
  getElectionSummary,
  listCandidatesByOffice
} from "./election-stats";

describe("election stats", () => {
  it("summarizes candidates, pledges, material collection, offices, and regions", () => {
    const summary = getElectionSummary(mockCandidates);

    expect(summary.totalCandidates).toBe(7);
    expect(summary.totalPledges).toBe(18);
    expect(summary.collectedMaterials).toBe(3);
    expect(summary.byOffice).toEqual([
      { officeType: "governor", label: "시·도지사", count: 3 },
      { officeType: "municipal_mayor", label: "구청장·시장·군수", count: 2 },
      { officeType: "education_superintendent", label: "교육감", count: 2 }
    ]);
    expect(summary.byRegion).toHaveLength(4);
    expect(summary.byRegion[0].count).toBe(3);
  });

  it("filters candidates by office without mutating original order", () => {
    const governors = listCandidatesByOffice(mockCandidates, "governor");

    expect(governors.map((candidate) => candidate.id)).toEqual([
      "mock-governor-seoul-01",
      "mock-governor-gyeonggi-01",
      "mock-governor-busan-01"
    ]);
    expect(mockCandidates[0].id).toBe("mock-governor-seoul-01");
  });

  it("finds candidate detail records by stable candidate id", () => {
    const candidate = getCandidateById(
      mockCandidates,
      "mock-education-gyeonggi-01"
    );

    expect(candidate?.id).toBe("mock-education-gyeonggi-01");
    expect(candidate?.pledges).toHaveLength(3);
  });
});
