import { describe, expect, it } from "vitest";

import {
  hasHiddenItems,
  nextVisibleLimit,
  visibleItems
} from "./incremental-rendering";

describe("incremental rendering helpers", () => {
  it("returns only the requested visible slice", () => {
    expect(visibleItems([1, 2, 3, 4], 2)).toEqual([1, 2]);
  });

  it("does not exceed the total item count when loading more", () => {
    expect(nextVisibleLimit({ current: 12, step: 12, total: 20 })).toBe(20);
  });

  it("detects whether hidden items remain", () => {
    expect(hasHiddenItems({ total: 20, visible: 12 })).toBe(true);
    expect(hasHiddenItems({ total: 12, visible: 12 })).toBe(false);
  });
});
