import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";

import type {
  Candidate,
  CampaignMaterialAnalysis,
  OfficeType,
  Pledge
} from "../types/election";

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
    rawApiResponse: true;
    region: true;
  };
}>;

export type CandidateListFilters = {
  officeType?: OfficeType;
  partyName?: string;
  query?: string;
  regionName?: string;
};

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

function defaultMaterial(): CampaignMaterialAnalysis {
  return {
    status: "pending",
    dominantColors: [],
    fontNotes: "공보물 수집 전",
    layoutNotes: "공보물 수집 후 분석 예정"
  };
}

function detailsToLines(details: Prisma.JsonValue): string[] {
  if (
    details &&
    typeof details === "object" &&
    !Array.isArray(details) &&
    typeof details.content === "string"
  ) {
    return details.content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

function mapPledge(pledge: DbCandidate["pledges"][number]): Pledge {
  return {
    id: pledge.id,
    title: pledge.title,
    summary: pledge.summary ?? "",
    category: pledge.category ?? "미분류",
    details: detailsToLines(pledge.details)
  };
}

function candidateCareers(candidate: DbCandidate): string[] {
  return [candidate.career1, candidate.career2].filter(
    (career): career is string => Boolean(career)
  );
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
    material: defaultMaterial(),
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
      rawApiResponse: true,
      region: true
    }
  });

  return rows.map(mapCandidate).sort(sortCandidates);
}

function buildCandidateWhere(
  electionId: string | undefined,
  filters: CandidateListFilters
): Prisma.CandidateWhereInput {
  const sgTypecode = sgTypecodeFromOfficeType(filters.officeType);
  const query = filters.query?.trim();

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
    ...(query
      ? {
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
        }
      : {})
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
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(10, pageSize));
  const totalCount = await prisma.candidate.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
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
      rawApiResponse: true,
      region: true
    },
    orderBy: [
      { electionType: { sgTypecode: "asc" } },
      { region: { name: "asc" } },
      { district: { name: "asc" } },
      { ballotNumber: "asc" },
      { name: "asc" }
    ],
    skip: (currentPage - 1) * safePageSize,
    take: safePageSize
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
      rawApiResponse: true,
      region: true
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
      page: currentPage,
      pageSize: safePageSize,
      totalCount,
      totalPages
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
      rawApiResponse: true,
      region: true
    }
  });

  return row ? mapCandidate(row) : undefined;
}
