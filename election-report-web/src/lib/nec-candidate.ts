export type NecCandidateItem = {
  sgId?: string;
  sgTypecode?: string;
  huboid?: string;
  sdName?: string;
  sggName?: string;
  wiwName?: string;
  giho?: string;
  gihoSangse?: string;
  jdName?: string;
  name?: string;
  gender?: string;
  age?: string;
  job?: string;
  edu?: string;
  career1?: string;
  career2?: string;
  status?: string;
};

export type CandidateRecord = {
  electionId?: string;
  sgTypecode?: string;
  candidateApiId?: string;
  regionName?: string;
  districtName?: string;
  constituencyName?: string;
  partyName?: string;
  name?: string;
  ballotNumber?: string;
  ballotNumberDetail?: string;
  gender?: string;
  age?: number;
  job?: string;
  education?: string;
  career1?: string;
  career2?: string;
  careers: string[];
  status: "REGISTERED" | "WITHDRAWN" | "INVALID" | "UNKNOWN";
};

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

function normalizeStatus(value: string | undefined): CandidateRecord["status"] {
  if (!value) {
    return "UNKNOWN";
  }

  if (value.includes("사퇴")) {
    return "WITHDRAWN";
  }

  if (value.includes("무효")) {
    return "INVALID";
  }

  if (value.includes("등록")) {
    return "REGISTERED";
  }

  return "UNKNOWN";
}

function candidateRecordKey(record: CandidateRecord): string | undefined {
  if (!record.electionId || !record.sgTypecode || !record.candidateApiId) {
    return undefined;
  }

  return `${record.electionId}:${record.sgTypecode}:${record.candidateApiId}`;
}

export function normalizeCandidateItems(payload: unknown): NecCandidateItem[] {
  const items = pickItems(payload);
  const rows = Array.isArray(items) ? items : [items].filter(Boolean);
  const keys = [
    "sgId",
    "sgTypecode",
    "huboid",
    "sdName",
    "sggName",
    "wiwName",
    "giho",
    "gihoSangse",
    "jdName",
    "name",
    "gender",
    "age",
    "job",
    "edu",
    "career1",
    "career2",
    "status"
  ] as const;

  return rows.filter(isRecord).map((item) => {
    const row: NecCandidateItem = {};

    for (const key of keys) {
      const value = asString(item[key]);

      if (value) {
        row[key] = value;
      }
    }

    return row;
  });
}

export function toCandidateRecords(
  items: NecCandidateItem[]
): CandidateRecord[] {
  const records: CandidateRecord[] = [];
  const keyedRecordIndexes = new Map<string, number>();

  for (const item of items) {
    const career1 = asString(item.career1);
    const career2 = asString(item.career2);
    const record: CandidateRecord = {
      electionId: asString(item.sgId),
      sgTypecode: asString(item.sgTypecode),
      candidateApiId: asString(item.huboid),
      regionName: asString(item.sdName),
      districtName: asString(item.sggName),
      constituencyName: asString(item.wiwName),
      partyName: asString(item.jdName),
      name: asString(item.name),
      ballotNumber: asString(item.giho),
      ballotNumberDetail: asString(item.gihoSangse),
      gender: asString(item.gender),
      age: asInteger(item.age),
      job: asString(item.job),
      education: asString(item.edu),
      career1,
      career2,
      careers: [career1, career2].filter((career) => career !== undefined),
      status: normalizeStatus(asString(item.status))
    };
    const key = candidateRecordKey(record);

    if (key) {
      const existingIndex = keyedRecordIndexes.get(key);

      if (existingIndex !== undefined) {
        records[existingIndex] = record;
        continue;
      }

      keyedRecordIndexes.set(key, records.length);
    }

    records.push(record);
  }

  return records;
}
