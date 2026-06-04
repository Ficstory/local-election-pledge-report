import { describe, expect, it } from "vitest";

import {
  classifyEducationCandidate,
  educationOrientationOptions,
  filterEducationCandidatesByOrientation
} from "./education-orientation";
import type { Candidate } from "../types/election";

function makeEducationCandidate(
  overrides: Partial<Candidate> & Pick<Candidate, "id">
): Candidate {
  const { id, ...rest } = overrides;

  return {
    id,
    electionId: "20260603",
    electionName: "제9회 전국동시지방선거",
    officeType: "education_superintendent",
    officeName: "교육감선거",
    regionName: "서울특별시",
    partyName: "무소속",
    candidateName: "교육감 후보",
    ballotNumber: "없음",
    status: "registered",
    age: 55,
    gender: "남",
    job: "교육자",
    education: "교육대학원 졸업",
    careers: [],
    pledges: [],
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

describe("education orientation classification", () => {
  it("classifies rights, civic, and community education pledges as progressive leaning", () => {
    const candidate = makeEducationCandidate({
      id: "progressive-candidate",
      pledges: [
        {
          id: "pledge-progressive-1",
          title: "학생인권과 민주시민교육 강화",
          summary: "마을교육공동체, 노동인권, 생태전환 교육을 확대합니다.",
          category: "민주시민",
          details: ["성평등 교육과 차별 없는 학교를 만들겠습니다."]
        }
      ]
    });

    const profile = classifyEducationCandidate(candidate);

    expect(profile.orientation.id).toBe("progressive");
    expect(profile.orientation.colorClass).toBe("orientation-progressive");
    expect(profile.confidence).toBe("high");
    expect(profile.evidence.progressive.map((item) => item.keyword)).toContain(
      "학생인권"
    );
    expect(profile.policyAxes[0]?.label).toBe("민주시민·인권·생태");
  });

  it("classifies achievement, evaluation, discipline, and civic order pledges as conservative leaning", () => {
    const candidate = makeEducationCandidate({
      id: "conservative-candidate",
      pledges: [
        {
          id: "pledge-conservative-1",
          title: "기초학력과 학력진단 책임교육",
          summary: "진단평가, 수월성 교육, 교권 회복, 생활지도 강화를 추진합니다.",
          category: "학력",
          details: ["인성교육과 자유민주주의 역사교육을 강화합니다."]
        }
      ]
    });

    const profile = classifyEducationCandidate(candidate);

    expect(profile.orientation.id).toBe("conservative");
    expect(profile.orientation.colorClass).toBe("orientation-conservative");
    expect(profile.confidence).toBe("high");
    expect(profile.evidence.conservative.map((item) => item.keyword)).toContain(
      "기초학력"
    );
    expect(profile.policyAxes[0]?.label).toBe("학력·수월성");
  });

  it("classifies low-evidence pledges into one of the two visible leanings", () => {
    const candidate = makeEducationCandidate({
      id: "fallback-candidate",
      pledges: [
        {
          id: "pledge-fallback-1",
          title: "AI 디지털 미래교육",
          summary: "학교 시설과 행정 서비스를 개선하고 기초학력 프로그램을 운영합니다.",
          category: "미래교육",
          details: ["지역별 맞춤형 교육 프로그램을 운영합니다."]
        }
      ]
    });

    const profile = classifyEducationCandidate(candidate);

    expect(profile.orientation.id).toBe("conservative");
    expect(profile.orientation.colorClass).toBe("orientation-conservative");
    expect(profile.confidence).toBe("low");
  });

  it("filters candidates by computed orientation", () => {
    const progressive = makeEducationCandidate({
      id: "progressive-candidate",
      pledges: [
        {
          id: "progressive-pledge",
          title: "학생인권과 민주시민교육",
          summary: "마을교육공동체와 노동인권 교육을 확대합니다.",
          category: "민주시민",
          details: []
        }
      ]
    });
    const conservative = makeEducationCandidate({
      id: "conservative-candidate",
      pledges: [
        {
          id: "conservative-pledge",
          title: "기초학력 진단평가",
          summary: "교권과 생활지도, 인성교육을 강화합니다.",
          category: "학력",
          details: []
        }
      ]
    });
    const fallback = makeEducationCandidate({
      id: "fallback-candidate",
      pledges: [
        {
          id: "fallback-pledge",
          title: "디지털 미래교육",
          summary: "기초학력과 학교 시설을 개선합니다.",
          category: "미래교육",
          details: []
        }
      ]
    });

    expect(
      filterEducationCandidatesByOrientation(
        [progressive, conservative, fallback],
        "progressive"
      ).map((candidate) => candidate.id)
    ).toEqual(["progressive-candidate"]);
    expect(
      filterEducationCandidatesByOrientation(
        [progressive, conservative, fallback],
        "conservative"
      ).map((candidate) => candidate.id)
    ).toEqual(["conservative-candidate", "fallback-candidate"]);
    expect(
      filterEducationCandidatesByOrientation(
        [progressive, conservative, fallback],
        undefined
      ).map((candidate) => candidate.id)
    ).toEqual([
      "progressive-candidate",
      "conservative-candidate",
      "fallback-candidate"
    ]);
    expect(educationOrientationOptions.map((option) => option.id)).toEqual([
      "progressive",
      "conservative"
    ]);
  });
});
