import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";

import type {
  Candidate,
  CandidateCampaignMaterial,
  CandidateCriminalRecordStatus,
  CandidateElectionResultStatus,
  CampaignMaterialAnalysis,
  OfficeType,
  Pledge
} from "../types/election";
import { normalizeCandidatePage } from "./candidate-pagination";
import { parsePledgeContent } from "./pledge-content";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

type DbCandidate = Prisma.CandidateGetPayload<{
  include: {
    district: true;
    election: true;
    electionType: true;
    party: true;
    pledges: {
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }];
    };
    materials: {
      include: {
        analysis: true;
      };
      orderBy: [{ materialType: "asc" }, { title: "asc" }, { createdAt: "asc" }];
    };
    rawApiResponse: true;
    region: true;
    result: true;
    disclosureAnalysis: true;
  };
}>;

export type CandidateListFilters = {
  criminalRecordStatus?: CandidateCriminalRecordStatus;
  electionResultStatus?: CandidateElectionResultStatus;
  officeType?: OfficeType;
  partyName?: string;
  query?: string;
  regionName?: string;
};

export type ElectionCandidateOption = Pick<
  Candidate,
  "candidateName" | "districtName" | "id" | "partyName" | "regionName"
>;

export type CandidateListResult = {
  candidates: Candidate[];
  filters: CandidateListFilters;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  options: {
    parties: string[];
    regions: string[];
  };
  summaryCandidates: Candidate[];
};

function officeTypeFromSgTypecode(sgTypecode: string): OfficeType {
  switch (sgTypecode) {
    case "3":
      return "governor";
    case "4":
      return "municipal_mayor";
    case "11":
      return "education_superintendent";
    default:
      return "municipal_mayor";
  }
}

function sgTypecodeFromOfficeType(officeType: OfficeType | undefined) {
  switch (officeType) {
    case "governor":
      return "3";
    case "municipal_mayor":
      return "4";
    case "education_superintendent":
      return "11";
    default:
      return undefined;
  }
}

function candidateStatusFromDb(status: string): Candidate["status"] {
  switch (status) {
    case "WITHDRAWN":
      return "withdrawn";
    case "INVALID":
      return "invalid";
    default:
      return "registered";
  }
}

function jsonStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapCampaignMaterial(
  material: DbCandidate["materials"][number]
): CandidateCampaignMaterial {
  return {
    id: material.id,
    materialType: material.materialType,
    title: material.title ?? material.materialType,
    sourceUrl: material.sourceUrl ?? undefined,
    sourceFilePath: material.sourceFilePath ?? undefined,
    storagePath: material.storagePath ?? undefined,
    sha256: material.sha256 ?? undefined,
    fileName: material.fileName ?? undefined,
    mimeType: material.mimeType ?? undefined,
    fileSizeBytes: material.fileSizeBytes ?? undefined,
    downloadStatus: material.downloadStatus,
    metadataCollectedAt: material.metadataCollectedAt?.toISOString(),
    collectedAt: material.collectedAt?.toISOString()
  };
}

function mapMaterial(materials: DbCandidate["materials"]): CampaignMaterialAnalysis {
  const materialRows = materials.map(mapCampaignMaterial);
  const analyzedMaterial = materials.find((material) => material.analysis);
  const firstPdfMaterial = materialRows.find((material) => material.sourceUrl);
  const downloadedCount = materialRows.filter(
    (material) => material.downloadStatus === "DOWNLOADED"
  ).length;
  const metadataCollectedCount = materialRows.filter(
    (material) => material.metadataCollectedAt
  ).length;

  return {
    status: analyzedMaterial
      ? "analyzed"
      : materialRows.length > 0
        ? "collected"
        : "pending",
    pdfUrl: firstPdfMaterial?.sourceUrl,
    pageCount: materials.find((material) => material.pageCount)?.pageCount ?? undefined,
    materialCount: materialRows.length,
    metadataCollectedCount,
    downloadedCount,
    materials: materialRows,
    dominantColors: jsonStringArray(analyzedMaterial?.analysis?.dominantColors),
    fontNotes:
      analyzedMaterial?.analysis?.fontNotes ??
      (materialRows.length > 0 ? "분석 전" : "공보물 수집 전"),
    layoutNotes:
      analyzedMaterial?.analysis?.layoutNotes ??
      (materialRows.length > 0 ? "분석 전" : "공보물 수집 후 분석 예정")
  };
}

function detailsContent(details: Prisma.JsonValue | null | undefined) {
  if (
    details &&
    typeof details === "object" &&
    !Array.isArray(details) &&
    typeof details.content === "string"
  ) {
    return details.content;
  }

  return "";
}

function detailsToLines(details: Prisma.JsonValue | null | undefined): string[] {
  return detailsContent(details)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mapPledge(pledge: DbCandidate["pledges"][number]): Pledge {
  const content = detailsContent(pledge.details);

  return {
    id: pledge.id,
    title: pledge.title,
    summary: pledge.summary ?? "",
    category: pledge.category ?? "미분류",
    details: detailsToLines(pledge.details),
    detailSections: parsePledgeContent(content)
  };
}

function candidateCareers(candidate: DbCandidate): string[] {
  return [candidate.career1, candidate.career2].filter(
    (career): career is string => Boolean(career)
  );
}

function mapElectionResult(result: DbCandidate["result"]): Candidate["result"] {
  if (!result) {
    return undefined;
  }

  return {
    elected: result.elected,
    rank: result.rank ?? undefined,
    voteCount: result.voteCount ?? undefined,
    voteRate: result.voteRate == null ? undefined : Number(result.voteRate)
  };
}

function mapCriminalRecord(
  disclosure: DbCandidate["disclosureAnalysis"]
): Candidate["criminalRecord"] {
  if (!disclosure) {
    return undefined;
  }

  return {
    analyzedAt: disclosure.analyzedAt?.toISOString(),
    excerpt: disclosure.criminalRecordExcerpt ?? undefined,
    offenses: jsonStringArray(disclosure.criminalOffenses),
    pageCount: disclosure.pageCount ?? undefined,
    punishments: jsonStringArray(disclosure.criminalPunishments),
    recordCount: disclosure.criminalRecordCount ?? undefined,
    sourceMaterialId: disclosure.sourceMaterialId ?? undefined,
    sourceMaterialPath: disclosure.sourceMaterialPath ?? undefined,
    status: disclosure.criminalRecordStatus as CandidateCriminalRecordStatus,
    summary: disclosure.criminalRecordSummary ?? "전과기록 분석 전",
    textCharCount: disclosure.textCharCount ?? undefined
  };
}

function mapCandidate(candidate: DbCandidate): Candidate {
  const officeType = officeTypeFromSgTypecode(candidate.electionType.sgTypecode);
  const fetchedAt = candidate.rawApiResponse?.fetchedAt.toISOString();

  return {
    id: candidate.id,
    electionId: candidate.electionId,
    electionName: candidate.election.name,
    officeType,
    officeName: candidate.electionType.name,
    regionName: candidate.region?.name ?? "미분류",
    districtName: candidate.district?.name,
    partyName: candidate.party?.name ?? "무소속",
    candidateName: candidate.name,
    ballotNumber: candidate.ballotNumber ?? "없음",
    status: candidateStatusFromDb(candidate.status),
    age: candidate.age ?? 0,
    gender: (candidate.gender ?? "미상") as Candidate["gender"],
    job: candidate.job ?? "미기재",
    education: candidate.education ?? "미기재",
    careers: candidateCareers(candidate),
    pledges: candidate.pledges.map(mapPledge),
    material: mapMaterial(candidate.materials),
    result: mapElectionResult(candidate.result),
    criminalRecord: mapCriminalRecord(candidate.disclosureAnalysis),
    source: {
      candidateApiId: candidate.candidateApiId ?? undefined,
      pledgeApiId: candidate.candidateApiId ?? undefined,
      fetchedAt
    }
  };
}

function sortCandidates(left: Candidate, right: Candidate) {
  const officeOrder: Record<OfficeType, number> = {
    governor: 1,
    municipal_mayor: 2,
    education_superintendent: 3
  };

  return (
    officeOrder[left.officeType] - officeOrder[right.officeType] ||
    left.regionName.localeCompare(right.regionName, "ko") ||
    (left.districtName ?? "").localeCompare(right.districtName ?? "", "ko") ||
    Number(left.ballotNumber || 999) - Number(right.ballotNumber || 999) ||
    left.candidateName.localeCompare(right.candidateName, "ko")
  );
}

export async function listElectionCandidates(): Promise<Candidate[]> {
  const electionId = process.env.NEXT_PUBLIC_DEFAULT_SG_ID?.trim();

  const rows = await prisma.candidate.findMany({
    where: {
      ...(electionId ? { electionId } : {})
    },
    include: {
      district: true,
      election: true,
      electionType: true,
      party: true,
      pledges: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
      },
      materials: {
        include: {
          analysis: true
        },
        orderBy: [{ materialType: "asc" }, { title: "asc" }, { createdAt: "asc" }]
      },
      rawApiResponse: true,
      region: true,
      result: true,
      disclosureAnalysis: true
    }
  });

  return rows.map(mapCandidate).sort(sortCandidates);
}

export async function listElectionCandidatesByFilters(
  filters: CandidateListFilters
): Promise<Candidate[]> {
  const electionId = process.env.NEXT_PUBLIC_DEFAULT_SG_ID?.trim();
  const where = buildCandidateWhere(electionId, filters);
  const rows = await prisma.candidate.findMany({
    where,
    include: {
      district: true,
      election: true,
      electionType: true,
      party: true,
      pledges: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
      },
      materials: {
        include: {
          analysis: true
        },
        orderBy: [{ materialType: "asc" }, { title: "asc" }, { createdAt: "asc" }]
      },
      rawApiResponse: true,
      region: true,
      result: true,
      disclosureAnalysis: true
    }
  });

  return rows.map(mapCandidate).sort(sortCandidates);
}

export async function listElectionCandidateOptionsByFilters(
  filters: CandidateListFilters
): Promise<ElectionCandidateOption[]> {
  const electionId = process.env.NEXT_PUBLIC_DEFAULT_SG_ID?.trim();
  const where = buildCandidateWhere(electionId, filters);
  const rows = await prisma.candidate.findMany({
    where,
    orderBy: [
      { electionType: { sgTypecode: "asc" } },
      { region: { name: "asc" } },
      { district: { name: "asc" } },
      { ballotNumber: "asc" },
      { name: "asc" }
    ],
    select: {
      district: {
        select: {
          name: true
        }
      },
      id: true,
      name: true,
      party: {
        select: {
          name: true
        }
      },
      region: {
        select: {
          name: true
        }
      }
    }
  });

  return rows.map((candidate) => ({
    candidateName: candidate.name,
    districtName: candidate.district?.name,
    id: candidate.id,
    partyName: candidate.party?.name ?? "무소속",
    regionName: candidate.region?.name ?? "미분류"
  }));
}

function buildCandidateWhere(
  electionId: string | undefined,
  filters: CandidateListFilters
): Prisma.CandidateWhereInput {
  const sgTypecode = sgTypecodeFromOfficeType(filters.officeType);
  const query = filters.query?.trim();
  const scopedConditions = [
    buildElectionResultWhere(filters.electionResultStatus),
    buildCandidateQueryWhere(query)
  ].filter((condition): condition is Prisma.CandidateWhereInput =>
    Boolean(condition)
  );

  return {
    ...(electionId ? { electionId } : {}),
    ...(sgTypecode
      ? {
          electionType: {
            sgTypecode
          }
        }
      : {}),
    ...(filters.regionName
      ? {
          region: {
            name: filters.regionName
          }
        }
      : {}),
    ...(filters.partyName
      ? {
          party: {
            name: filters.partyName
          }
        }
      : {}),
    ...(filters.criminalRecordStatus
      ? {
          disclosureAnalysis: {
            criminalRecordStatus: filters.criminalRecordStatus
          }
        }
      : {}),
    ...(scopedConditions.length > 0 ? { AND: scopedConditions } : {})
  };
}

function buildElectionResultWhere(
  status: CandidateElectionResultStatus | undefined
): Prisma.CandidateWhereInput | undefined {
  switch (status) {
    case "ELECTED":
      return {
        result: {
          is: {
            elected: true
          }
        }
      };
    case "NOT_ELECTED":
      return {
        result: {
          is: {
            elected: false
          }
        }
      };
    case "UNKNOWN":
      return {
        OR: [
          {
            result: {
              is: null
            }
          },
          {
            result: {
              is: {
                elected: null
              }
            }
          }
        ]
      };
    default:
      return undefined;
  }
}

function buildCandidateQueryWhere(
  query: string | undefined
): Prisma.CandidateWhereInput | undefined {
  if (!query) {
    return undefined;
  }

  return {
    OR: [
      {
        name: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        party: {
          name: {
            contains: query,
            mode: "insensitive"
          }
        }
      },
      {
        region: {
          name: {
            contains: query,
            mode: "insensitive"
          }
        }
      },
      {
        district: {
          name: {
            contains: query,
            mode: "insensitive"
          }
        }
      }
    ]
  };
}

export async function listElectionCandidatePage({
  filters,
  page,
  pageSize
}: {
  filters: CandidateListFilters;
  page: number;
  pageSize: number;
}): Promise<CandidateListResult> {
  const electionId = process.env.NEXT_PUBLIC_DEFAULT_SG_ID?.trim();
  const where = buildCandidateWhere(electionId, filters);
  const totalCount = await prisma.candidate.count({ where });
  const pagination = normalizeCandidatePage({ page, pageSize, totalCount });
  const rows = await prisma.candidate.findMany({
    where,
    include: {
      district: true,
      election: true,
      electionType: true,
      party: true,
      pledges: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
      },
      materials: {
        include: {
          analysis: true
        },
        orderBy: [{ materialType: "asc" }, { title: "asc" }, { createdAt: "asc" }]
      },
      rawApiResponse: true,
      region: true,
      result: true,
      disclosureAnalysis: true
    },
    orderBy: [
      { electionType: { sgTypecode: "asc" } },
      { region: { name: "asc" } },
      { district: { name: "asc" } },
      { ballotNumber: "asc" },
      { name: "asc" }
    ],
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize
  });
  const summaryRows = await prisma.candidate.findMany({
    where,
    include: {
      district: true,
      election: true,
      electionType: true,
      party: true,
      pledges: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
      },
      materials: {
        include: {
          analysis: true
        },
        orderBy: [{ materialType: "asc" }, { title: "asc" }, { createdAt: "asc" }]
      },
      rawApiResponse: true,
      region: true,
      result: true,
      disclosureAnalysis: true
    }
  });
  const regions = await prisma.region.findMany({
    where: {
      candidates: {
        some: {
          ...(electionId ? { electionId } : {})
        }
      }
    },
    orderBy: {
      name: "asc"
    },
    select: {
      name: true
    }
  });
  const parties = await prisma.party.findMany({
    where: {
      candidates: {
        some: {
          ...(electionId ? { electionId } : {})
        }
      }
    },
    orderBy: {
      name: "asc"
    },
    select: {
      name: true
    }
  });

  return {
    candidates: rows.map(mapCandidate),
    filters,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount,
      totalPages: pagination.totalPages
    },
    options: {
      parties: parties.map((party) => party.name),
      regions: regions.map((region) => region.name)
    },
    summaryCandidates: summaryRows.map(mapCandidate).sort(sortCandidates)
  };
}

export async function getElectionCandidateById(
  id: string
): Promise<Candidate | undefined> {
  const row = await prisma.candidate.findUnique({
    where: {
      id
    },
    include: {
      district: true,
      election: true,
      electionType: true,
      party: true,
      pledges: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
      },
      materials: {
        include: {
          analysis: true
        },
        orderBy: [{ materialType: "asc" }, { title: "asc" }, { createdAt: "asc" }]
      },
      rawApiResponse: true,
      region: true,
      result: true,
      disclosureAnalysis: true
    }
  });

  return row ? mapCandidate(row) : undefined;
}
