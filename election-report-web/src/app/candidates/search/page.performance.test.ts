import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const dependentFiltersSource = readFileSync(
  new URL("./CandidateSearchDependentFilters.tsx", import.meta.url),
  "utf8"
);

describe("candidate search rendering path", () => {
  it("keeps office tab counts and region options on a lightweight query", () => {
    expect(pageSource).toContain("listElectionCandidateOptionsByFilters");
    expect(pageSource).toContain(
      "const officeCandidateOptions = await listElectionCandidateOptionsByFilters"
    );
    expect(pageSource).not.toContain(
      "const officeCandidates = await listElectionCandidatesByFilters"
    );
  });

  it("keeps party and criminal record filters wired to the search form", () => {
    expect(pageSource).toContain("선거유형");
    expect(pageSource).toContain("candidate-search-filter-field");
    expect(pageSource).toContain("CandidateSearchDependentFilters");
    expect(dependentFiltersSource).toContain('name="party"');
    expect(dependentFiltersSource).toContain('name="criminalRecord"');
    expect(pageSource).toContain("partyName");
    expect(pageSource).toContain("criminalRecordStatus");
    expect(pageSource).toContain("criminalRecordFilterOptions");
    expect(dependentFiltersSource).toContain("전과 유무");
  });

  it("narrows dependent region and party options by existing candidate pairs", () => {
    expect(dependentFiltersSource).toContain("hasMatchingCandidate");
    expect(dependentFiltersSource).toContain(
      "candidate.regionName === regionValue"
    );
    expect(dependentFiltersSource).toContain(
      "candidate.partyName === partyValue"
    );
  });
});
