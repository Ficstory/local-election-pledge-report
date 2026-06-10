import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CandidateMaterials } from "./CandidateMaterials";
import type { CandidateCampaignMaterial } from "../../../types/election";

function makeMaterial(
  overrides: Partial<CandidateCampaignMaterial> & Pick<CandidateCampaignMaterial, "id">
): CandidateCampaignMaterial {
  const { id, ...rest } = overrides;

  return {
    downloadStatus: "DOWNLOADED",
    id,
    materialType: "ELECTION_BULLETIN",
    title: "선거공보",
    ...rest
  };
}

describe("CandidateMaterials", () => {
  it("shows a voter-facing PDF list without collection metadata", () => {
    const markup = renderToStaticMarkup(
      <CandidateMaterials
        materials={[
          makeMaterial({
            collectedAt: "2026-06-02T01:54:55.940Z",
            fileSizeBytes: 124000,
            id: "bulletin",
            materialType: "ELECTION_BULLETIN",
            metadataCollectedAt: "2026-06-02T01:44:11.239Z",
            sha256: "internal-sha",
            sourceUrl: "https://cdn.example.test/bulletin.pdf",
            storagePath: "storage/materials/internal-bulletin.pdf",
            title: "선거공보"
          }),
          makeMaterial({
            downloadStatus: "METADATA_ONLY",
            id: "pledge",
            materialType: "PLEDGE_DOCUMENT",
            title: "선거공약서"
          })
        ]}
      />
    );

    expect(markup).toContain("선거자료");
    expect(markup).toContain("2개");
    expect(markup).toContain("선거공보");
    expect(markup).toContain("선거공약서");
    expect(markup).toContain("원문 보기");
    expect(markup).toContain('href="/materials/bulletin"');
    expect(markup).toContain("자료 준비 중");

    expect(markup).not.toContain("https://cdn.example.test/bulletin.pdf");
    expect(markup).not.toContain("메타데이터");
    expect(markup).not.toContain("다운로드 완료");
    expect(markup).not.toContain("CDN");
    expect(markup).not.toContain("ELECTION_BULLETIN");
    expect(markup).not.toContain("storage/materials/internal-bulletin.pdf");
    expect(markup).not.toContain("internal-sha");
    expect(markup).not.toContain("fileSizeBytes");
  });
});
