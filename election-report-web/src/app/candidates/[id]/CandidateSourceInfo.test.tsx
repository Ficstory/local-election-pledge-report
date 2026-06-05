import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CandidateSourceInfo } from "./CandidateSourceInfo";

describe("CandidateSourceInfo", () => {
  it("shows voter-facing source information instead of API mapping details", () => {
    const markup = renderToStaticMarkup(
      <CandidateSourceInfo
        source={{
          candidateApiId: "100162026",
          fetchedAt: "2026-06-02T01:39:17.057Z",
          pledgeApiId: "100162026"
        }}
      />
    );

    expect(markup).toContain("자료 출처");
    expect(markup).toContain("중앙선거관리위원회");
    expect(markup).toContain("최종 확인");
    expect(markup).toContain("2026-06-02");

    expect(markup).not.toContain("API 매핑");
    expect(markup).not.toContain("후보자 API ID");
    expect(markup).not.toContain("공약 API ID");
    expect(markup).not.toContain("100162026");
    expect(markup).not.toContain("2026-06-02T01:39:17.057Z");
  });
});
