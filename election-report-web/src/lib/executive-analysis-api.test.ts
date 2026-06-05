import { describe, expect, it } from "vitest";

import {
  buildExecutiveAnalysisPath,
  parseExecutiveAnalysisRequest
} from "./executive-analysis-api";

describe("executive analysis api helpers", () => {
  it("keeps pledge text query out of the candidate DB filter", () => {
    const request = parseExecutiveAnalysisRequest(
      new URLSearchParams({
        election: "local-executive",
        party: "Party",
        q: "transit",
        region: "Region"
      })
    );

    expect(request).toEqual({
      candidateFilters: {
        officeType: "municipal_mayor",
        partyName: "Party",
        regionName: "Region"
      },
      filters: {
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
          partyName: "Party",
          query: "jobs",
          regionName: "Region"
        }
      })
    ).toBe(
      "/api/executive-analysis?election=regional-executive&candidate=candidate-1&party=Party&q=jobs&region=Region"
    );
  });
});
