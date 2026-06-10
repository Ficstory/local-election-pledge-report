import type { Candidate, CandidateCampaignMaterial } from "../types/election";

type MaterialReference = Pick<
  CandidateCampaignMaterial,
  "id" | "materialType" | "sourceUrl" | "storagePath"
>;

const pledgeMaterialTypes = ["TOP_FIVE_PLEDGES"] as const;
const electionBulletinMaterialTypes = ["ELECTION_BULLETIN"] as const;
const defaultMaterialTypePriority = [
  "TOP_FIVE_PLEDGES",
  "PLEDGE_DOCUMENT",
  "ELECTION_BULLETIN"
] as const;

export function isViewableCampaignMaterial(material: MaterialReference) {
  return Boolean(material.storagePath || material.sourceUrl);
}

export function campaignMaterialViewerUrl(material: MaterialReference) {
  return isViewableCampaignMaterial(material)
    ? `/materials/${encodeURIComponent(material.id)}`
    : undefined;
}

export function firstViewableCampaignMaterial(
  materials: MaterialReference[] | undefined
) {
  return materials?.find(isViewableCampaignMaterial);
}

export function firstViewableCampaignMaterialByType(
  materials: MaterialReference[] | undefined,
  materialTypes: readonly string[]
) {
  for (const materialType of materialTypes) {
    const material = materials?.find(
      (candidateMaterial) =>
        candidateMaterial.materialType === materialType &&
        isViewableCampaignMaterial(candidateMaterial)
    );

    if (material) {
      return material;
    }
  }

  return undefined;
}

export function candidateTopFivePledgeViewerUrl(
  candidate: Pick<Candidate, "material">
) {
  const material = firstViewableCampaignMaterialByType(
    candidate.material.materials,
    pledgeMaterialTypes
  );

  return material ? campaignMaterialViewerUrl(material) : undefined;
}

export function candidateElectionBulletinViewerUrl(
  candidate: Pick<Candidate, "material">
) {
  const material = firstViewableCampaignMaterialByType(
    candidate.material.materials,
    electionBulletinMaterialTypes
  );

  return material ? campaignMaterialViewerUrl(material) : undefined;
}

export function candidateMaterialViewerUrl(candidate: Pick<Candidate, "material">) {
  const material =
    firstViewableCampaignMaterialByType(
      candidate.material.materials,
      defaultMaterialTypePriority
    ) ?? firstViewableCampaignMaterial(candidate.material.materials);

  return material ? campaignMaterialViewerUrl(material) : candidate.material.pdfUrl;
}
