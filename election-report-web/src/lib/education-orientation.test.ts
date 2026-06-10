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

  it("uses verified blue-dominant campaign colors before conservative keyword scores", () => {
    const candidate = makeEducationCandidate({
      id: "color-progressive-override",
      source: { candidateApiId: "100162806" },
      pledges: [
        {
          id: "color-progressive-pledge",
          title: "기초학력 자유민주주의 인성교육",
          summary: "학력진단, 교육 정상화, 교권 회복, 생활지도를 강화합니다.",
          category: "학력",
          details: ["자유민주주의 역사교육과 인성교육을 강화합니다."]
        }
      ]
    });

    const profile = classifyEducationCandidate(candidate);

    expect(profile.orientation.id).toBe("progressive");
    expect(profile.basis).toBe("color");
    expect(profile.colorEvidence).toEqual({ blue: 1088825, red: 7562 });
    expect(profile.conservativeScore).toBeGreaterThan(profile.progressiveScore);
  });

  it("uses verified red-dominant campaign colors before progressive keyword scores", () => {
    const candidate = makeEducationCandidate({
      id: "color-conservative-override",
      source: { candidateApiId: "100163258" },
      pledges: [
        {
          id: "color-conservative-pledge",
          title: "학생인권과 민주진보 교육 강화",
          summary: "민주시민, 생태전환, 평화통일 교육을 확대합니다.",
          category: "민주시민",
          details: ["마을교육공동체와 노동인권 교육을 강화합니다."]
        }
      ]
    });

    const profile = classifyEducationCandidate(candidate);

    expect(profile.orientation.id).toBe("conservative");
    expect(profile.basis).toBe("color");
    expect(profile.colorEvidence).toEqual({ blue: 141752, red: 255099 });
    expect(profile.progressiveScore).toBeGreaterThan(profile.conservativeScore);
  });

  it("keeps verified blue-dominant Im Seong-mu and Ko Eui-sook as progressive", () => {
    const imSeongMu = classifyEducationCandidate(
      makeEducationCandidate({
        id: "im-seong-mu",
        source: { candidateApiId: "100162085" }
      })
    );
    const koEuiSook = classifyEducationCandidate(
      makeEducationCandidate({
        id: "ko-eui-sook",
        source: { candidateApiId: "100156980" }
      })
    );

    expect(imSeongMu.orientation.id).toBe("progressive");
    expect(imSeongMu.basis).toBe("color");
    expect(imSeongMu.colorEvidence).toEqual({ blue: 414512, red: 959 });
    expect(koEuiSook.orientation.id).toBe("progressive");
    expect(koEuiSook.basis).toBe("color");
    expect(koEuiSook.colorEvidence).toEqual({ blue: 1063080, red: 7808 });
  });

  it("keeps verified blue-dominant Kim Seok-jun as progressive", () => {
    const profile = classifyEducationCandidate(
      makeEducationCandidate({
        id: "kim-seok-jun",
        candidateName: "김석준",
        source: { candidateApiId: "100162788" }
      })
    );

    expect(profile.orientation.id).toBe("progressive");
    expect(profile.basis).toBe("color");
    expect(profile.colorEvidence).toEqual({ blue: 519585, red: 12025 });
  });

  it("keeps verified blue-dominant Sung Kwang-jin as progressive", () => {
    const profile = classifyEducationCandidate(
      makeEducationCandidate({
        id: "sung-kwang-jin",
        candidateName: "성광진",
        source: { candidateApiId: "100153764" }
      })
    );

    expect(profile.orientation.id).toBe("progressive");
    expect(profile.basis).toBe("color");
    expect(profile.colorEvidence).toEqual({ blue: 147208, red: 9427 });
  });

  it("keeps manually reviewed Park Hyun-sook, Shin Kyung-ho, and Lim Tae-hee orientations", () => {
    const parkHyunSook = classifyEducationCandidate(
      makeEducationCandidate({
        id: "park-hyun-sook",
        candidateName: "박현숙",
        source: { candidateApiId: "100153782" }
      })
    );
    const shinKyungHo = classifyEducationCandidate(
      makeEducationCandidate({
        id: "shin-kyung-ho",
        candidateName: "신경호",
        source: { candidateApiId: "100162320" }
      })
    );
    const limTaeHee = classifyEducationCandidate(
      makeEducationCandidate({
        id: "lim-tae-hee",
        candidateName: "임태희",
        source: { candidateApiId: "100163064" }
      })
    );

    expect(parkHyunSook.orientation.id).toBe("progressive");
    expect(parkHyunSook.basis).toBe("color");
    expect(shinKyungHo.orientation.id).toBe("conservative");
    expect(shinKyungHo.basis).toBe("color");
    expect(limTaeHee.orientation.id).toBe("conservative");
    expect(limTaeHee.basis).toBe("manual");
    expect(limTaeHee.colorEvidence).toBeUndefined();
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
