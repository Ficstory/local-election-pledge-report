import { describe, expect, it } from "vitest";

import {
  candidateMatchesElectionTab,
  electionTabs,
  executiveAnalysisCopyByTab,
  parseElectionTab
} from "./election-tabs";
import type { Candidate } from "../types/election";

function makeCandidate(overrides: Partial<Candidate>): Candidate {
  return {
    id: "candidate-1",
    electionId: "20260603",
    electionName: "2026 전국동시지방선거",
    officeType: "education_superintendent",
    officeName: "교육감선거",
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
    pledges: [],
    material: {
      status: "pending",
      dominantColors: [],
      fontNotes: "",
      layoutNotes: ""
    },
    source: {},
    ...overrides
  };
}

describe("election tabs", () => {
  it("exposes the top-level tabs in education, regional, and local order", () => {
    expect(electionTabs.map((tab) => [tab.id, tab.label])).toEqual([
      ["education", "교육감"],
      ["regional-executive", "시·도지사"],
      ["local-executive", "시·군·구청장"]
    ]);
  });

  it("keeps the legacy mayor query on the local executive tab", () => {
    expect(parseElectionTab("mayor")).toBe("local-executive");
    expect(parseElectionTab("regional-executive")).toBe("regional-executive");
    expect(parseElectionTab(undefined)).toBe("education");
  });

  it("separates regional executives from every city, county, and district head", () => {
    const regionalExecutive = makeCandidate({
      officeType: "governor",
      officeName: "시·도지사선거",
      regionName: "경기도",
      districtName: "경기도"
    });
    const cityMayor = makeCandidate({
      officeType: "municipal_mayor",
      officeName: "구·시·군의 장선거",
      regionName: "경기도",
      districtName: "수원시"
    });
    const countyHead = makeCandidate({
      officeType: "municipal_mayor",
      officeName: "구·시·군의 장선거",
      regionName: "부산광역시",
      districtName: "기장군"
    });
    const districtHead = makeCandidate({
      officeType: "municipal_mayor",
      officeName: "구·시·군의 장선거",
      regionName: "서울특별시",
      districtName: "종로구"
    });

    expect(candidateMatchesElectionTab(regionalExecutive, "regional-executive")).toBe(
      true
    );
    expect(candidateMatchesElectionTab(cityMayor, "regional-executive")).toBe(false);
    expect(candidateMatchesElectionTab(cityMayor, "local-executive")).toBe(true);
    expect(candidateMatchesElectionTab(countyHead, "local-executive")).toBe(true);
    expect(candidateMatchesElectionTab(districtHead, "local-executive")).toBe(true);
  });

  it("provides separate analysis copy for regional and local executives", () => {
    expect(executiveAnalysisCopyByTab["regional-executive"].title).toBe(
      "시·도지사 공약 분석"
    );
    expect(executiveAnalysisCopyByTab["local-executive"].title).toBe(
      "시·군·구청장 공약 분석"
    );
  });
});
