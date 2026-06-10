import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("home page executive analysis rendering path", () => {
  it("keeps executive pledge analysis out of the initial server render", () => {
    expect(pageSource).toContain("buildExecutiveAnalysisPath");
    expect(pageSource).toContain("analysisUrl={analysisUrl}");
    expect(pageSource).not.toContain("analyzeMayorPledges");
    expect(pageSource).not.toContain("prepareMayorPledgeClientAnalysis");
    expect(pageSource).not.toContain("candidateMatchesElectionTab");
  });
});
