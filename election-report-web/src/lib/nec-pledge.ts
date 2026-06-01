export type NecPledgeItem = {
  [key: string]: string | undefined;
  sgId?: string;
  sgTypecode?: string;
  cnddtId?: string;
  sggName?: string;
  sidoName?: string;
  wiwName?: string;
  partyName?: string;
  krName?: string;
  cnName?: string;
  prmsCnt?: string;
};

export type PledgeRecord = {
  electionId?: string;
  sgTypecode?: string;
  candidateApiId?: string;
  candidateName?: string;
  regionName?: string;
  districtName?: string;
  constituencyName?: string;
  partyName?: string;
  priority?: number;
  category?: string;
  title: string;
  summary?: string;
  details: {
    content: string;
    sourceSlot: number;
  };
};

const pledgeSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }

  return Number(value);
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

function itemKeys() {
  const baseKeys = [
    "sgId",
    "sgTypecode",
    "cnddtId",
    "sggName",
    "sidoName",
    "wiwName",
    "partyName",
    "krName",
    "cnName",
    "prmsCnt"
  ];
  const slotKeys = pledgeSlots.flatMap((slot) => [
    `prmsOrd${slot}`,
    `prmsRealmName${slot}`,
    `prmsTitle${slot}`,
    `prmmCont${slot}`,
    `prmsCont${slot}`
  ]);

  return [...baseKeys, ...slotKeys];
}

function summarizeContent(content: string | undefined): string | undefined {
  return content
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

export function normalizePledgeItems(payload: unknown): NecPledgeItem[] {
  const items = pickItems(payload);
  const rows = Array.isArray(items) ? items : [items].filter(Boolean);

  return rows.filter(isRecord).map((item) => {
    const row: NecPledgeItem = {};

    for (const key of itemKeys()) {
      const value = asString(item[key]);

      if (value) {
        row[key] = value;
      }
    }

    return row;
  });
}

export function toPledgeRecords(items: NecPledgeItem[]): PledgeRecord[] {
  const records: PledgeRecord[] = [];

  for (const item of items) {
    for (const slot of pledgeSlots) {
      const priority = asInteger(asString(item[`prmsOrd${slot}`]));
      const category = asString(item[`prmsRealmName${slot}`]);
      const title = asString(item[`prmsTitle${slot}`]);
      const content =
        asString(item[`prmmCont${slot}`]) ?? asString(item[`prmsCont${slot}`]);

      if (!title && !content) {
        continue;
      }

      const summary = summarizeContent(content);

      records.push({
        electionId: asString(item.sgId),
        sgTypecode: asString(item.sgTypecode),
        candidateApiId: asString(item.cnddtId),
        candidateName: asString(item.krName),
        regionName: asString(item.sidoName),
        districtName: asString(item.sggName),
        constituencyName: asString(item.wiwName),
        partyName: asString(item.partyName),
        priority,
        category,
        title: title ?? summary ?? `Pledge ${priority ?? slot}`,
        summary,
        details: {
          content: content ?? "",
          sourceSlot: slot
        }
      });
    }
  }

  return records;
}
