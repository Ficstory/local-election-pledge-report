import { describe, expect, it } from "vitest";

import {
  buildExecutiveAnalysisPath,
  parseExecutiveAnalysisRequest
} from "./executive-analysis-api";
import {
  canUsePrecomputedExecutiveAnalysis,
  precomputedExecutiveAnalysisPath
} from "./precomputed-executive-analysis";

describe("executive analysis api helpers", () => {
  it("keeps pledge text query out of the candidate DB filter", () => {
    const request = parseExecutiveAnalysisRequest(
      new URLSearchParams({
        district: "District",
        election: "local-executive",
        party: "Party",
        q: "transit",
        region: "Region"
      })
    );

    expect(request).toEqual({
      candidateFilters: {
        districtName: "District",
        officeType: "municipal_mayor",
        partyName: "Party",
        regionName: "Region"
      },
      filters: {
        districtName: "District",
        partyName: "Party",
        query: "transit",
        regionName: "Region"
      },
      tab: "local-executive"
    });
  });

  it("rejects non-executive analysis requests", () => {
    expect(
      parseExecutiveAnalysisRequest(
        new URLSearchParams({
          election: "education"
        })
      )
    ).toBeUndefined();
  });

  it("builds a stable analysis path from the active filters", () => {
    expect(
      buildExecutiveAnalysisPath({
        electionValue: "regional-executive",
        filters: {
          candidateId: "candidate-1",
          districtName: "District",
          partyName: "Party",
          query: "jobs",
          regionName: "Region"
        }
      })
    ).toBe(
      "/api/executive-analysis?election=regional-executive&candidate=candidate-1&party=Party&district=District&q=jobs&region=Region"
    );
  });

  it("uses precomputed analysis only for unfiltered executive tab loads", () => {
    expect(canUsePrecomputedExecutiveAnalysis({})).toBe(true);
    expect(
      canUsePrecomputedExecutiveAnalysis({
        regionName: "서울특별시"
      })
    ).toBe(false);
    expect(
      canUsePrecomputedExecutiveAnalysis({
        districtName: "강서구"
      })
    ).toBe(false);
    expect(
      canUsePrecomputedExecutiveAnalysis({
        query: "일자리"
      })
    ).toBe(false);
  });

  it("stores precomputed client analysis under the executive pledge outputs", () => {
    expect(precomputedExecutiveAnalysisPath("local-executive")).toContain(
      "storage"
    );
    expect(precomputedExecutiveAnalysisPath("local-executive")).toContain(
      "executive-pledges"
    );
    expect(precomputedExecutiveAnalysisPath("local-executive")).toContain(
      "client-analysis"
    );
    expect(precomputedExecutiveAnalysisPath("local-executive")).toContain(
      "local-executive.json"
    );
  });
});
