export type CommonSgCodeItem = {
  sgId?: string;
  sgName?: string;
  sgTypecode?: string;
  sgTypeName?: string;
  sgVotedate?: string;
};

export type ElectionTypeRecord = {
  electionId: string;
  electionName: string;
  sgTypecode: string;
  name: string;
  voteDate?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pickItems(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return undefined;
  }

  const response = isRecord(payload.response) ? payload.response : payload;
  const body = isRecord(response.body) ? response.body : response;
  const items = isRecord(body.items) ? body.items : body;

  return items.item;
}

function normalizeVoteDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{8}$/.test(value)) {
    return undefined;
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function normalizeCommonSgCodeItems(
  payload: unknown
): CommonSgCodeItem[] {
  const items = pickItems(payload);
  const rows = Array.isArray(items) ? items : [items].filter(Boolean);

  return rows.filter(isRecord).map((item) => {
    const row: CommonSgCodeItem = {};

    for (const key of [
      "sgId",
      "sgName",
      "sgTypecode",
      "sgTypeName",
      "sgVotedate"
    ] as const) {
      const value = asString(item[key]);

      if (value) {
        row[key] = value;
      }
    }

    return row;
  });
}

export function toElectionTypeRecords(
  items: CommonSgCodeItem[]
): ElectionTypeRecord[] {
  const electionNames = new Map<string, string>();
  const records = new Map<string, ElectionTypeRecord>();

  for (const item of items) {
    if (item.sgId && item.sgName && item.sgTypecode === "0") {
      electionNames.set(item.sgId, item.sgName);
    }
  }

  for (const item of items) {
    if (!item.sgId || !item.sgName || !item.sgTypecode) {
      continue;
    }

    if (item.sgTypecode === "0") {
      continue;
    }

    records.set(`${item.sgId}:${item.sgTypecode}`, {
      electionId: item.sgId,
      electionName: electionNames.get(item.sgId) ?? item.sgName,
      sgTypecode: item.sgTypecode,
      name: item.sgTypeName ?? item.sgName,
      voteDate: normalizeVoteDate(item.sgVotedate)
    });
  }

  return Array.from(records.values()).sort((left, right) =>
    left.sgTypecode.localeCompare(right.sgTypecode, "ko", { numeric: true })
  );
}
