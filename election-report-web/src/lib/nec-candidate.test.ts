import { describe, expect, it } from "vitest";

import {
  normalizeCandidateItems,
  toCandidateRecords
} from "./nec-candidate";

describe("normalizeCandidateItems", () => {
  it("returns candidate item arrays from the official response shape", () => {
    const payload = {
      response: {
        body: {
          items: {
            item: [
              {
                sgId: "20260603",
                sgTypecode: "3",
                huboid: "100157144",
                sdName: "서울특별시",
                sggName: "서울특별시",
                jdName: "더불어민주당",
                name: "정원오"
              },
              {
                sgId: "20260603",
                sgTypecode: "3",
                huboid: "100162984",
                sdName: "서울특별시",
                sggName: "서울특별시",
                jdName: "국민의힘",
                name: "오세훈"
              }
            ]
          }
        }
      }
    };

    expect(normalizeCandidateItems(payload)).toHaveLength(2);
  });

  it("wraps a single item response in an array", () => {
    const payload = {
      response: {
        body: {
          items: {
            item: {
              sgId: "20260603",
              sgTypecode: "11",
              huboid: "100153800",
              sdName: "서울특별시",
              sggName: "서울특별시",
              name: "김영배"
            }
          }
        }
      }
    };

    expect(normalizeCandidateItems(payload)).toEqual([
      {
        huboid: "100153800",
        name: "김영배",
        sdName: "서울특별시",
        sgId: "20260603",
        sgTypecode: "11",
        sggName: "서울특별시"
      }
    ]);
  });
});

describe("toCandidateRecords", () => {
  it("maps official candidate fields into ingestion-ready records", () => {
    const records = toCandidateRecords([
      {
        sgId: "20260603",
        sgTypecode: "4",
        huboid: "100154016",
        sdName: "서울특별시",
        sggName: "종로구",
        wiwName: "종로구",
        giho: "1",
        gihoSangse: "",
        jdName: "더불어민주당",
        name: "유찬종",
        gender: "남",
        age: "66",
        job: "정당인",
        edu: "연세대학교 경법대학 법학 졸업",
        career1: "(전)종로구청장 후보",
        career2: "(전)이재명 대통령후보 종로구 공동상임 선대위원장",
        status: "등록"
      }
    ]);

    expect(records).toEqual([
      {
        electionId: "20260603",
        sgTypecode: "4",
        candidateApiId: "100154016",
        regionName: "서울특별시",
        districtName: "종로구",
        constituencyName: "종로구",
        partyName: "더불어민주당",
        name: "유찬종",
        ballotNumber: "1",
        ballotNumberDetail: undefined,
        gender: "남",
        age: 66,
        job: "정당인",
        education: "연세대학교 경법대학 법학 졸업",
        career1: "(전)종로구청장 후보",
        career2: "(전)이재명 대통령후보 종로구 공동상임 선대위원장",
        careers: [
          "(전)종로구청장 후보",
          "(전)이재명 대통령후보 종로구 공동상임 선대위원장"
        ],
        status: "REGISTERED"
      }
    ]);
  });

  it("handles missing stable candidate keys without throwing", () => {
    const records = toCandidateRecords([
      {
        sgId: "20260603",
        sgTypecode: "11",
        sdName: "서울특별시",
        sggName: "서울특별시",
        jdName: "",
        name: "김영배",
        giho: "",
        age: "57",
        status: "등록"
      }
    ]);

    expect(records).toMatchObject([
      {
        electionId: "20260603",
        sgTypecode: "11",
        candidateApiId: undefined,
        partyName: undefined,
        ballotNumber: undefined,
        name: "김영배",
        status: "REGISTERED"
      }
    ]);
  });

  it("preserves region, district, constituency, and party names even without codes", () => {
    const [record] = toCandidateRecords([
      {
        sgId: "20260603",
        sgTypecode: "4",
        huboid: "100163635",
        sdName: "서울특별시",
        sggName: "종로구",
        wiwName: "종로구",
        jdName: "국민의힘",
        name: "정문헌"
      }
    ]);

    expect(record.regionName).toBe("서울특별시");
    expect(record.districtName).toBe("종로구");
    expect(record.constituencyName).toBe("종로구");
    expect(record.partyName).toBe("국민의힘");
  });

  it("deduplicates records by election, election type, and candidate API id", () => {
    const records = toCandidateRecords([
      {
        sgId: "20260603",
        sgTypecode: "3",
        huboid: "100162984",
        sdName: "서울특별시",
        sggName: "서울특별시",
        jdName: "국민의힘",
        name: "오세훈",
        status: "등록"
      },
      {
        sgId: "20260603",
        sgTypecode: "3",
        huboid: "100162984",
        sdName: "서울특별시",
        sggName: "서울특별시",
        jdName: "국민의힘",
        name: "오세훈",
        status: "등록"
      }
    ]);

    expect(records).toHaveLength(1);
  });
});
