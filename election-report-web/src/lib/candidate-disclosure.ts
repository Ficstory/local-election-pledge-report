import type {
  Candidate,
  CandidateCriminalRecordStatus
} from "../types/election";

export const criminalRecordFilterOptions: Array<{
  id: CandidateCriminalRecordStatus;
  label: string;
}> = [
  { id: "HAS_RECORD", label: "전과 있음" },
  { id: "NONE", label: "전과 없음" }
];

export function parseCriminalRecordStatus(
  value: string | undefined
): CandidateCriminalRecordStatus | undefined {
  const status = value?.trim();

  return criminalRecordFilterOptions.some((option) => option.id === status)
    ? (status as CandidateCriminalRecordStatus)
    : undefined;
}

export function criminalRecordFilterLabel(
  status: CandidateCriminalRecordStatus | undefined
) {
  return criminalRecordFilterOptions.find((option) => option.id === status)?.label;
}

export function criminalRecordLabel(record: Candidate["criminalRecord"]) {
  if (!record) {
    return "전과 분석 전";
  }

  switch (record.status) {
    case "HAS_RECORD":
      return typeof record.recordCount === "number" && record.recordCount > 0
        ? `전과 ${record.recordCount}건`
        : "전과 있음";
    case "NONE":
      return "전과 없음";
    case "UNAVAILABLE":
    case "UNKNOWN":
    default:
      return "전과 분석 전";
  }
}

export function criminalRecordClass(record: Candidate["criminalRecord"]) {
  return record?.status.toLowerCase().replace("_", "-") ?? "not-analyzed";
}

export function criminalRecordDetail(record: Candidate["criminalRecord"]) {
  if (!record) {
    return "선거공보 전과기록 분석 전";
  }

  return record.summary;
}
