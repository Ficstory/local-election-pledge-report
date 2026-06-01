import { describe, expect, it } from "vitest";

import { normalizePledgeItems, toPledgeRecords } from "./nec-pledge";

describe("normalizePledgeItems", () => {
  it("returns pledge item arrays from the official response shape", () => {
    const payload = {
      response: {
        body: {
          items: {
            item: [
              {
                sgId: "20260603",
                sgTypecode: "3",
                cnddtId: "100153736",
                krName: "Candidate A",
                prmsCnt: "2"
              },
              {
                sgId: "20260603",
                sgTypecode: "4",
                cnddtId: "100153831",
                krName: "Candidate B",
                prmsCnt: "1"
              }
            ]
          }
        }
      }
    };

    expect(normalizePledgeItems(payload)).toHaveLength(2);
  });

  it("wraps a single item response in an array", () => {
    const payload = {
      response: {
        body: {
          items: {
            item: {
              sgId: "20260603",
              sgTypecode: "11",
              cnddtId: "100153737",
              krName: "Candidate C",
              prmsCnt: "1"
            }
          }
        }
      }
    };

    expect(normalizePledgeItems(payload)).toEqual([
      {
        cnddtId: "100153737",
        krName: "Candidate C",
        prmsCnt: "1",
        sgId: "20260603",
        sgTypecode: "11"
      }
    ]);
  });
});

describe("toPledgeRecords", () => {
  it("expands one candidate pledge row into multiple pledge records", () => {
    const records = toPledgeRecords([
      {
        sgId: "20260603",
        sgTypecode: "3",
        cnddtId: "100153736",
        sidoName: "Daejeon",
        sggName: "Daejeon",
        wiwName: "",
        partyName: "Party A",
        krName: "Candidate A",
        prmsCnt: "2",
        prmsOrd1: "1",
        prmsRealmName1: "economy",
        prmsTitle1: "First pledge",
        prmmCont1: "Goal line\nDetail line",
        prmsOrd2: "2",
        prmsRealmName2: "housing",
        prmsTitle2: "Second pledge",
        prmmCont2: "Second content",
        prmsOrd3: "",
        prmsRealmName3: "",
        prmsTitle3: "",
        prmmCont3: ""
      }
    ]);

    expect(records).toEqual([
      {
        electionId: "20260603",
        sgTypecode: "3",
        candidateApiId: "100153736",
        candidateName: "Candidate A",
        regionName: "Daejeon",
        districtName: "Daejeon",
        constituencyName: undefined,
        partyName: "Party A",
        priority: 1,
        category: "economy",
        title: "First pledge",
        summary: "Goal line",
        details: {
          content: "Goal line\nDetail line",
          sourceSlot: 1
        }
      },
      {
        electionId: "20260603",
        sgTypecode: "3",
        candidateApiId: "100153736",
        candidateName: "Candidate A",
        regionName: "Daejeon",
        districtName: "Daejeon",
        constituencyName: undefined,
        partyName: "Party A",
        priority: 2,
        category: "housing",
        title: "Second pledge",
        summary: "Second content",
        details: {
          content: "Second content",
          sourceSlot: 2
        }
      }
    ]);
  });

  it("keeps the stable linkage back to the candidate API id", () => {
    const [record] = toPledgeRecords([
      {
        sgId: "20260603",
        sgTypecode: "11",
        cnddtId: "100153737",
        krName: "Candidate C",
        prmsOrd1: "1",
        prmsTitle1: "Education pledge",
        prmmCont1: "Education content"
      }
    ]);

    expect(record.candidateApiId).toBe("100153737");
    expect(record.electionId).toBe("20260603");
    expect(record.sgTypecode).toBe("11");
  });

  it("preserves long pledge text without truncation", () => {
    const longText = `Goal\n${"long content ".repeat(200).trim()}`;
    const [record] = toPledgeRecords([
      {
        sgId: "20260603",
        sgTypecode: "4",
        cnddtId: "100153831",
        krName: "Candidate B",
        prmsOrd1: "1",
        prmsTitle1: "Long pledge",
        prmmCont1: longText
      }
    ]);

    expect(record.details.content).toBe(longText);
    expect(record.details.content.length).toBe(longText.length);
  });

  it("skips empty pledge slots", () => {
    const records = toPledgeRecords([
      {
        sgId: "20260603",
        sgTypecode: "3",
        cnddtId: "100153736",
        krName: "Candidate A",
        prmsOrd1: "1",
        prmsTitle1: "",
        prmmCont1: "",
        prmsOrd2: "2",
        prmsTitle2: "Valid pledge",
        prmmCont2: "Valid content"
      }
    ]);

    expect(records).toHaveLength(1);
    expect(records[0].priority).toBe(2);
    expect(records[0].title).toBe("Valid pledge");
  });
});
