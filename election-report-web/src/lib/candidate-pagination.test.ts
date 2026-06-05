import { describe, expect, it } from "vitest";

import {
  CANDIDATE_LIST_PAGE_SIZE,
  normalizeCandidatePage
} from "./candidate-pagination";

describe("candidate pagination", () => {
  it("uses five candidates as the default page size", () => {
    expect(CANDIDATE_LIST_PAGE_SIZE).toBe(5);
  });

  it("accepts five item pages and calculates the resulting page count", () => {
    expect(
      normalizeCandidatePage({
        page: 1,
        pageSize: CANDIDATE_LIST_PAGE_SIZE,
        totalCount: 58
      })
    ).toEqual({
      page: 1,
      pageSize: 5,
      totalPages: 12
    });
  });

  it("keeps the current page inside the available range", () => {
    expect(
      normalizeCandidatePage({
        page: 99,
        pageSize: CANDIDATE_LIST_PAGE_SIZE,
        totalCount: 11
      }).page
    ).toBe(3);
  });
});
