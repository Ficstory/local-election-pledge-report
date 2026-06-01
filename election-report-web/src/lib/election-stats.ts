import type { Candidate, ElectionSummary, OfficeType } from "../types/election";

export const officeLabels: Record<OfficeType, string> = {
  governor: "시·도지사",
  municipal_mayor: "구청장·시장·군수",
  education_superintendent: "교육감"
};

const officeOrder: OfficeType[] = [
  "governor",
  "municipal_mayor",
  "education_superintendent"
];

export function getElectionSummary(candidates: Candidate[]): ElectionSummary {
  const totalPledges = candidates.reduce(
    (total, candidate) => total + candidate.pledges.length,
    0
  );
  const collectedMaterials = candidates.filter((candidate) =>
    ["collected", "analyzed"].includes(candidate.material.status)
  ).length;

  const byOffice = officeOrder.map((officeType) => ({
    officeType,
    label: officeLabels[officeType],
    count: candidates.filter((candidate) => candidate.officeType === officeType)
      .length
  }));

  const regionCounts = candidates.reduce<Record<string, number>>(
    (counts, candidate) => {
      counts[candidate.regionName] = (counts[candidate.regionName] ?? 0) + 1;
      return counts;
    },
    {}
  );

  const byRegion = Object.entries(regionCounts)
    .map(([regionName, count]) => ({ regionName, count }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.regionName.localeCompare(right.regionName, "ko")
    );

  return {
    totalCandidates: candidates.length,
    totalPledges,
    collectedMaterials,
    byOffice,
    byRegion
  };
}

export function listCandidatesByOffice(
  candidates: Candidate[],
  officeType: OfficeType
): Candidate[] {
  return candidates.filter((candidate) => candidate.officeType === officeType);
}

export function getCandidateById(
  candidates: Candidate[],
  candidateId: string
): Candidate | undefined {
  return candidates.find((candidate) => candidate.id === candidateId);
}
