import { describe, expect, it } from "vitest";

import {
  buildPolicyMaterialSourceUrl,
  parsePolicyMaterialFileInfo
} from "./nec-policy-material";

describe("parsePolicyMaterialFileInfo", () => {
  it("parses election bulletin and top five pledge PDF paths", () => {
    const records = parsePolicyMaterialFileInfo({
      candidateApiId: "100157144",
      fileinfo:
        "선거공보||20260603/PDF/PBINFO/1100/003_100157144_20260520_1.pdf||||1||HEIGHT||Y||00||01,5대공약||20260603/PDF/P5_PRMS_PUB/1100/001_100157144_20260516_1.pdf||11551||1||HEIGHT||Y||00||01",
      sgId: "20260603",
      sgTypecode: "3"
    });

    expect(records).toEqual([
      {
        candidateApiId: "100157144",
        conversionResultCode: "00",
        materialType: "ELECTION_BULLETIN",
        openStatusCode: "01",
        previewEnabled: true,
        sgId: "20260603",
        sgTypecode: "3",
        sourceFilePath:
          "20260603/PDF/PBINFO/1100/003_100157144_20260520_1.pdf",
        sourceMaterialId:
          "POLICY_NEC:20260603:3:100157144:ELECTION_BULLETIN:20260603/PDF/PBINFO/1100/003_100157144_20260520_1.pdf",
        sourceUrl:
          "https://cdn.nec.go.kr/policy_pdf/20260603/PDF/PBINFO/1100/003_100157144_20260520_1.pdf",
        title: "선거공보"
      },
      {
        candidateApiId: "100157144",
        conversionResultCode: "00",
        materialType: "TOP_FIVE_PLEDGES",
        openStatusCode: "01",
        previewEnabled: true,
        sgId: "20260603",
        sgTypecode: "3",
        sourceFilePath:
          "20260603/PDF/P5_PRMS_PUB/1100/001_100157144_20260516_1.pdf",
        sourceMaterialId:
          "POLICY_NEC:20260603:3:100157144:TOP_FIVE_PLEDGES:20260603/PDF/P5_PRMS_PUB/1100/001_100157144_20260516_1.pdf",
        sourceUrl:
          "https://cdn.nec.go.kr/policy_pdf/20260603/PDF/P5_PRMS_PUB/1100/001_100157144_20260516_1.pdf",
        title: "5대공약"
      }
    ]);
  });

  it("keeps pledge document placeholders without PDF paths", () => {
    const [record] = parsePolicyMaterialFileInfo({
      candidateApiId: "100157144",
      fileinfo: "선거공약서||||||0||HEIGHT||Y||||00",
      sgId: "20260603",
      sgTypecode: "3"
    });

    expect(record).toMatchObject({
      materialType: "PLEDGE_DOCUMENT",
      openStatusCode: "00",
      previewEnabled: true,
      sourceFilePath: null,
      sourceMaterialId:
        "POLICY_NEC:20260603:3:100157144:PLEDGE_DOCUMENT:NO_URL",
      sourceUrl: null,
      title: "선거공약서"
    });
  });

  it("parses an education superintendent pledge document with a real PDF path", () => {
    const [record] = parsePolicyMaterialFileInfo({
      candidateApiId: "200000001",
      fileinfo:
        "선거공약서||20260603/PDF/PLEDGE/1100/011_200000001_20260521_1.pdf||9933||1||HEIGHT||Y||00||01",
      sgId: "20260603",
      sgTypecode: "11"
    });

    expect(record.materialType).toBe("PLEDGE_DOCUMENT");
    expect(record.sourceUrl).toBe(
      "https://cdn.nec.go.kr/policy_pdf/20260603/PDF/PLEDGE/1100/011_200000001_20260521_1.pdf"
    );
  });

  it("returns an empty array for nullish or blank fileinfo", () => {
    expect(
      parsePolicyMaterialFileInfo({
        candidateApiId: "100157144",
        fileinfo: null,
        sgId: "20260603",
        sgTypecode: "3"
      })
    ).toEqual([]);
    expect(
      parsePolicyMaterialFileInfo({
        candidateApiId: "100157144",
        fileinfo: "   ",
        sgId: "20260603",
        sgTypecode: "3"
      })
    ).toEqual([]);
  });

  it("marks unknown Korean material names as UNKNOWN", () => {
    const [record] = parsePolicyMaterialFileInfo({
      candidateApiId: "100157144",
      fileinfo:
        "선거벽보||20260603/PDF/POSTER/1100/003_100157144_20260520_1.pdf||1||HEIGHT||Y||00||01",
      sgId: "20260603",
      sgTypecode: "3"
    });

    expect(record.materialType).toBe("UNKNOWN");
    expect(record.title).toBe("선거벽보");
  });

  it("deduplicates repeated material rows by stable sourceMaterialId", () => {
    const records = parsePolicyMaterialFileInfo({
      candidateApiId: "100157144",
      fileinfo:
        "선거공보||20260603/PDF/PBINFO/1100/003_100157144_20260520_1.pdf||||1||HEIGHT||Y||00||01,선거공보||20260603/PDF/PBINFO/1100/003_100157144_20260520_1.pdf||||1||HEIGHT||Y||00||01",
      sgId: "20260603",
      sgTypecode: "3"
    });

    expect(records).toHaveLength(1);
  });
});

describe("buildPolicyMaterialSourceUrl", () => {
  it("joins CDN base URL and source file path", () => {
    expect(
      buildPolicyMaterialSourceUrl(
        "20260603/PDF/PBINFO/1100/003_100157144_20260520_1.pdf"
      )
    ).toBe(
      "https://cdn.nec.go.kr/policy_pdf/20260603/PDF/PBINFO/1100/003_100157144_20260520_1.pdf"
    );
  });
});
