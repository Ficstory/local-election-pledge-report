export const POLICY_MATERIAL_CDN_BASE_URL =
  "https://cdn.nec.go.kr/policy_pdf";

export const POLICY_MATERIAL_SOURCE_SYSTEM = "POLICY_NEC";

export const POLICY_MATERIAL_WEB_BASE_URL = "https://policy.nec.go.kr";

export const POLICY_MATERIAL_ENDPOINT_PATHS = {
  gu: "/plc/commiment/initUCACommimentGu.do",
  list: "/plc/commiment/initUCACommimentList.do",
  region: "/plc/commiment/initUCACommimentRegion.do",
  sgg: "/plc/commiment/initUCACommimentSgg.do"
} as const;

export const POLICY_MATERIAL_ELECTION_TYPE_CODES = ["3", "4", "11"] as const;

export type PolicyMaterialElectionTypeCode =
  (typeof POLICY_MATERIAL_ELECTION_TYPE_CODES)[number];

export type PolicyMaterialType =
  | "ELECTION_BULLETIN"
  | "PLEDGE_DOCUMENT"
  | "TOP_FIVE_PLEDGES"
  | "UNKNOWN";

export type PolicyMaterialRecord = {
  candidateApiId: string;
  sgId: string;
  sgTypecode: string;
  materialType: PolicyMaterialType;
  title: string;
  sourceFilePath: string | null;
  sourceUrl: string | null;
  sourceMaterialId: string;
  openStatusCode: string | null;
  conversionResultCode: string | null;
  previewEnabled: boolean;
};

export type ParsePolicyMaterialFileInfoInput = {
  fileinfo: string | null | undefined;
  candidateApiId: string;
  sgId: string;
  sgTypecode: string;
};

export function buildPolicyMaterialSubSgId(
  sgId: string,
  sgTypecode: string
): string {
  return `${sgTypecode}${sgId}`;
}

export function isPolicyMaterialElectionTypeCode(
  value: string
): value is PolicyMaterialElectionTypeCode {
  return POLICY_MATERIAL_ELECTION_TYPE_CODES.includes(
    value as PolicyMaterialElectionTypeCode
  );
}

function cleanText(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

function looksLikePdfPath(value: string | undefined): value is string {
  return Boolean(value && /\.pdf(?:$|[?#])/i.test(value));
}

export function normalizePolicyMaterialType(title: string): PolicyMaterialType {
  switch (title.trim()) {
    case "선거공보":
    case "책자형선거공보":
    case "전단형선거공보":
      return "ELECTION_BULLETIN";
    case "선거공약서":
      return "PLEDGE_DOCUMENT";
    case "5대공약":
      return "TOP_FIVE_PLEDGES";
    default:
      return "UNKNOWN";
  }
}

export function buildPolicyMaterialSourceUrl(
  sourceFilePath: string | null | undefined
): string | null {
  const filePath = cleanText(sourceFilePath);

  if (!filePath) {
    return null;
  }

  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const normalizedPath = filePath
    .replace(/^\/+/, "")
    .replace(/^policy_pdf\/+/i, "");

  return `${POLICY_MATERIAL_CDN_BASE_URL}/${normalizedPath}`;
}

function buildSourceMaterialId({
  candidateApiId,
  materialType,
  sgId,
  sgTypecode,
  sourceFilePath
}: {
  candidateApiId: string;
  sgId: string;
  sgTypecode: string;
  materialType: PolicyMaterialType;
  sourceFilePath: string | null;
}) {
  return [
    POLICY_MATERIAL_SOURCE_SYSTEM,
    sgId,
    sgTypecode,
    candidateApiId,
    materialType,
    sourceFilePath ?? "NO_URL"
  ].join(":");
}

export function parsePolicyMaterialFileInfo({
  candidateApiId,
  fileinfo,
  sgId,
  sgTypecode
}: ParsePolicyMaterialFileInfoInput): PolicyMaterialRecord[] {
  const rawFileinfo = fileinfo?.trim();

  if (!rawFileinfo) {
    return [];
  }

  const recordsBySourceId = new Map<string, PolicyMaterialRecord>();

  for (const rawEntry of rawFileinfo.split(",")) {
    const fields = rawEntry.split("||");
    const title = cleanText(fields[0]);

    if (!title) {
      continue;
    }

    const rawSourceFilePath = cleanText(fields[1]);
    const sourceFilePath = looksLikePdfPath(rawSourceFilePath)
      ? rawSourceFilePath
      : null;
    const materialType = normalizePolicyMaterialType(title);
    const sourceMaterialId = buildSourceMaterialId({
      candidateApiId,
      materialType,
      sgId,
      sgTypecode,
      sourceFilePath
    });
    const record: PolicyMaterialRecord = {
      candidateApiId,
      sgId,
      sgTypecode,
      materialType,
      title,
      sourceFilePath,
      sourceUrl: buildPolicyMaterialSourceUrl(sourceFilePath),
      sourceMaterialId,
      openStatusCode: cleanText(fields[7]) ?? null,
      conversionResultCode: cleanText(fields[6]) ?? null,
      previewEnabled: cleanText(fields[5])?.toUpperCase() === "Y"
    };

    recordsBySourceId.set(sourceMaterialId, record);
  }

  return [...recordsBySourceId.values()];
}
