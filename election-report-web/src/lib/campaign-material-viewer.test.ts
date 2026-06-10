import { describe, expect, it } from "vitest";

import {
  candidateElectionBulletinViewerUrl,
  candidateMaterialViewerUrl,
  candidateTopFivePledgeViewerUrl
} from "./campaign-material-viewer";
import type { Candidate } from "../types/election";

function makeCandidate(
  materials: Candidate["material"]["materials"]
): Pick<Candidate, "material"> {
  return {
    material: {
      dominantColors: [],
      fontNotes: "",
      layoutNotes: "",
      materials,
      status: "collected"
    }
  };
}

describe("campaign material viewer URLs", () => {
  it("prefers 5대공약 for pledge source links and separates election bulletins", () => {
    const candidate = makeCandidate([
      {
        downloadStatus: "DOWNLOADED",
        id: "bulletin",
        materialType: "ELECTION_BULLETIN",
        sourceUrl: "https://cdn.example.test/bulletin.pdf",
        title: "선거공보"
      },
      {
        downloadStatus: "DOWNLOADED",
        id: "top-five",
        materialType: "TOP_FIVE_PLEDGES",
        sourceUrl: "https://cdn.example.test/top-five.pdf",
        title: "5대공약"
      }
    ]);

    expect(candidateTopFivePledgeViewerUrl(candidate)).toBe("/materials/top-five");
    expect(candidateMaterialViewerUrl(candidate)).toBe("/materials/top-five");
    expect(candidateElectionBulletinViewerUrl(candidate)).toBe(
      "/materials/bulletin"
    );
  });
});
