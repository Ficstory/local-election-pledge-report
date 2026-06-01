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
      { officeType: "governor", label: "시장/도지사", count: 3 },
      { officeType: "municipal_mayor", label: "구청장/시장/군수", count: 2 },
      { officeType: "education_superintendent", label: "교육감", count: 2 }
    ]);
    expect(summary.byRegion).toEqual([
      { regionName: "경기도", count: 3 },
      { regionName: "서울특별시", count: 2 },
      { regionName: "부산광역시", count: 1 },
      { regionName: "충청북도", count: 1 }
    ]);
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

    expect(candidate?.candidateName).toBe("경기교육감 샘플 후보");
    expect(candidate?.pledges.map((pledge) => pledge.title)).toContain(
      "돌봄 공백 해소"
    );
  });
});
