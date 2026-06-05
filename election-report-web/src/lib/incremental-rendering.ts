type NextVisibleLimitInput = {
  current: number;
  step: number;
  total: number;
};

type HiddenItemsInput = {
  total: number;
  visible: number;
};

export function visibleItems<T>(items: T[], limit: number) {
  return items.slice(0, Math.max(0, limit));
}

export function nextVisibleLimit({ current, step, total }: NextVisibleLimitInput) {
  return Math.min(total, Math.max(0, current) + Math.max(1, step));
}

export function hasHiddenItems({ total, visible }: HiddenItemsInput) {
  return visible < total;
}
