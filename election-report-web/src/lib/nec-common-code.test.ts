import { describe, expect, it } from "vitest";

import {
  normalizeCommonSgCodeItems,
  toElectionTypeRecords
} from "./nec-common-code";

describe("normalizeCommonSgCodeItems", () => {
  it("returns item arrays from the official response shape", () => {
    const payload = {
      response: {
        body: {
          items: {
            item: [
              {
                sgId: "20260603",
                sgName: "제9회 전국동시지방선거",
                sgTypecode: "3",
                sgVotedate: "20260603"
              },
              {
                sgId: "20260603",
                sgName: "교육감선거",
                sgTypecode: "11",
                sgVotedate: "20260603"
              }
            ]
          }
        }
      }
    };

    expect(normalizeCommonSgCodeItems(payload)).toHaveLength(2);
  });

  it("wraps a single item response in an array", () => {
    const payload = {
      response: {
        body: {
          items: {
            item: {
              sgId: "20260603",
              sgName: "구·시·군의 장선거",
              sgTypecode: "4",
              sgVotedate: "20260603"
            }
          }
        }
      }
    };

    expect(normalizeCommonSgCodeItems(payload)).toEqual([
      {
        sgId: "20260603",
        sgName: "구·시·군의 장선거",
        sgTypecode: "4",
        sgVotedate: "20260603"
      }
    ]);
  });
});

describe("toElectionTypeRecords", () => {
  it("uses sgTypecode 0 as the election name and removes duplicate type codes", () => {
    const records = toElectionTypeRecords([
      {
        sgId: "20260603",
        sgName: "제9회 전국동시지방선거",
        sgTypecode: "0",
        sgVotedate: "20260603"
      },
      {
        sgId: "20260603",
        sgName: "시·도지사선거",
        sgTypecode: "3",
        sgVotedate: "20260603"
      },
      {
        sgId: "20260603",
        sgName: "시·도지사선거",
        sgTypecode: "3",
        sgVotedate: "20260603"
      },
      {
        sgId: "20260603",
        sgName: "제9회 전국동시지방선거"
      }
    ]);

    expect(records).toEqual([
      {
        electionId: "20260603",
        electionName: "제9회 전국동시지방선거",
        sgTypecode: "3",
        name: "시·도지사선거",
        voteDate: "2026-06-03"
      }
    ]);
  });
});
