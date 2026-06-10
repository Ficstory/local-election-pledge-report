import type { Candidate, OfficeType } from "../types/election";

export type ElectionTabId =
  | "education"
  | "regional-executive"
  | "local-executive";

export type ExecutiveElectionTabId = Exclude<ElectionTabId, "education">;

export type ElectionAnalysisCopy = {
  eyebrow: string;
  title: string;
  lead: string;
  filterDescription: string;
  emptyTitle: string;
  emptyDescription: string;
};

export const electionTabs: Array<{
  id: ElectionTabId;
  label: string;
  description: string;
}> = [
  {
    id: "education",
    label: "교육감",
    description: "시·도 교육감"
  },
  {
    id: "regional-executive",
    label: "시·도지사",
    description: "광역단체장"
  },
  {
    id: "local-executive",
    label: "시·군·구청장",
    description: "기초단체장"
  }
];

export const executiveAnalysisCopyByTab: Record<
  ExecutiveElectionTabId,
  ElectionAnalysisCopy
> = {
  "regional-executive": {
    emptyDescription: "지역이나 후보자 조건을 변경해보세요.",
    emptyTitle: "조건에 맞는 시·도지사 후보 공약이 없습니다.",
    eyebrow: "시·도지사 후보 공약",
    filterDescription:
      "후보자를 선택하지 않으면 조건에 맞는 전체 시·도지사 후보 공약을 합산합니다.",
    lead: "지역별 시·도지사 후보자의 주요 공약 키워드와 원문을 확인하세요.",
    title: "시·도지사 공약 분석"
  },
  "local-executive": {
    emptyDescription: "지역이나 후보자 조건을 변경해보세요.",
    emptyTitle: "조건에 맞는 시·군·구청장 후보 공약이 없습니다.",
    eyebrow: "시·군·구청장 후보 공약",
    filterDescription:
      "후보자를 선택하지 않으면 조건에 맞는 전체 시·군·구청장 후보 공약을 합산합니다.",
    lead: "지역별 시·군·구청장 후보자의 주요 공약 키워드와 원문을 확인하세요.",
    title: "시·군·구청장 공약 분석"
  }
};

export function parseElectionTab(value: string | undefined): ElectionTabId {
  if (value === "mayor") {
    return "local-executive";
  }

  return electionTabs.some((tab) => tab.id === value)
    ? (value as ElectionTabId)
    : "education";
}

export function isExecutiveElectionTab(
  tab: ElectionTabId
): tab is ExecutiveElectionTabId {
  return tab === "regional-executive" || tab === "local-executive";
}

export function officeTypeForElectionTab(
  tab: ElectionTabId
): OfficeType | undefined {
  switch (tab) {
    case "education":
      return "education_superintendent";
    case "regional-executive":
      return "governor";
    case "local-executive":
      return "municipal_mayor";
  }
}

export function candidateMatchesElectionTab(
  candidate: Candidate,
  tab: ElectionTabId
) {
  return candidate.officeType === officeTypeForElectionTab(tab);
}
