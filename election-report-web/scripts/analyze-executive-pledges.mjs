import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

import {
  buildExecutivePledgeAnalysis,
  EXECUTIVE_PLEDGE_ANALYSIS_ELECTION_ID,
  EXECUTIVE_PLEDGE_ANALYSIS_OUTPUT_DIR,
  EXECUTIVE_SG_TYPECODES,
  serializeExecutivePledgeAnalysis
} from "../src/lib/executive-pledge-analysis.ts";
import { createPrismaClient } from "./create-prisma-client.mjs";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const prisma = createPrismaClient();
const electionId =
  process.env.NEXT_PUBLIC_DEFAULT_SG_ID?.trim() ??
  EXECUTIVE_PLEDGE_ANALYSIS_ELECTION_ID;
const outputDir = path.join(process.cwd(), EXECUTIVE_PLEDGE_ANALYSIS_OUTPUT_DIR);

function officeTypeFromSgTypecode(sgTypecode) {
  return sgTypecode === "3" ? "governor" : "municipal_mayor";
}

function detailsContent(details) {
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

function detailsToLines(details) {
  return detailsContent(details)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function numberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapMaterial(materials) {
  const materialRows = materials.map((material) => ({
    collectedAt: material.collectedAt?.toISOString(),
    downloadStatus: material.downloadStatus,
    fileName: material.fileName ?? undefined,
    fileSizeBytes: material.fileSizeBytes ?? undefined,
    id: material.id,
    materialType: material.materialType,
    metadataCollectedAt: material.metadataCollectedAt?.toISOString(),
    mimeType: material.mimeType ?? undefined,
    sourceFilePath: material.sourceFilePath ?? undefined,
    sourceUrl: material.sourceUrl ?? undefined,
    storagePath: material.storagePath ?? undefined,
    title: material.title ?? material.materialType
  }));
  const firstSourceMaterial = materialRows.find((material) => material.sourceUrl);

  return {
    dominantColors: [],
    downloadedCount: materialRows.filter(
      (material) => material.downloadStatus === "DOWNLOADED"
    ).length,
    fontNotes: "",
    layoutNotes: "",
    materialCount: materialRows.length,
    materials: materialRows,
    metadataCollectedCount: materialRows.filter(
      (material) => material.metadataCollectedAt
    ).length,
    pdfUrl: firstSourceMaterial?.sourceUrl,
    status: materialRows.length > 0 ? "collected" : "pending"
  };
}

function mapCandidate(row) {
  return {
    age: row.age ?? 0,
    ballotNumber: row.ballotNumber ?? "",
    candidateName: row.name,
    careers: [row.career1, row.career2].filter(Boolean),
    districtName: row.district?.name,
    education: row.education ?? "",
    electionId: row.electionId,
    electionName: row.election.name,
    electionResult: row.result
      ? {
          elected: row.result.elected,
          rank: row.result.rank,
          voteCount: row.result.voteCount,
          voteRate: numberOrNull(row.result.voteRate)
        }
      : undefined,
    gender: row.gender ?? "",
    id: row.id,
    job: row.job ?? "",
    material: mapMaterial(row.materials),
    officeName: row.electionType.name,
    officeType: officeTypeFromSgTypecode(row.electionType.sgTypecode),
    partyName: row.party?.name ?? "",
    pledges: row.pledges.map((pledge) => ({
      category: pledge.category ?? "",
      details: detailsToLines(pledge.details),
      id: pledge.id,
      summary: pledge.summary ?? "",
      title: pledge.title
    })),
    regionName: row.region?.name ?? "",
    sgTypecode: row.electionType.sgTypecode,
    source: {
      candidateApiId: row.candidateApiId ?? undefined,
      pledgeApiId: row.candidateApiId ?? undefined
    },
    status: row.status === "WITHDRAWN" ? "withdrawn" : "registered"
  };
}

async function fetchExecutiveCandidates() {
  return prisma.candidate.findMany({
    where: {
      electionId,
      electionType: {
        sgTypecode: {
          in: [...EXECUTIVE_SG_TYPECODES]
        }
      }
    },
    include: {
      district: {
        select: {
          name: true
        }
      },
      election: {
        select: {
          name: true
        }
      },
      electionType: {
        select: {
          name: true,
          sgTypecode: true
        }
      },
      materials: {
        orderBy: [{ materialType: "asc" }, { title: "asc" }, { createdAt: "asc" }],
        select: {
          collectedAt: true,
          downloadStatus: true,
          fileName: true,
          fileSizeBytes: true,
          id: true,
          materialType: true,
          metadataCollectedAt: true,
          mimeType: true,
          sourceFilePath: true,
          sourceUrl: true,
          storagePath: true,
          title: true
        }
      },
      party: {
        select: {
          name: true
        }
      },
      pledges: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
      },
      region: {
        select: {
          name: true
        }
      },
      result: true
    },
    orderBy: [
      {
        electionType: {
          sgTypecode: "asc"
        }
      },
      {
        region: {
          name: "asc"
        }
      },
      {
        district: {
          name: "asc"
        }
      },
      {
        ballotNumber: "asc"
      },
      {
        name: "asc"
      }
    ]
  });
}

async function writeOutputs(serialized) {
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDir, "summary.json"), serialized.summaryJson, "utf8"),
    writeFile(
      path.join(outputDir, "keyword-frequency.csv"),
      serialized.keywordFrequencyCsv,
      "utf8"
    ),
    writeFile(
      path.join(outputDir, "phrase-frequency.csv"),
      serialized.phraseFrequencyCsv,
      "utf8"
    ),
    writeFile(
      path.join(outputDir, "policy-category-summary.csv"),
      serialized.policyCategorySummaryCsv,
      "utf8"
    ),
    writeFile(
      path.join(outputDir, "elected-vs-non-elected-keywords.csv"),
      serialized.electedVsNonElectedKeywordsCsv,
      "utf8"
    ),
    writeFile(
      path.join(outputDir, "candidate-keyword-summary.csv"),
      serialized.candidateKeywordSummaryCsv,
      "utf8"
    )
  ]);
}

try {
  const rows = await fetchExecutiveCandidates();
  const candidates = rows.map(mapCandidate);
  const analysis = buildExecutivePledgeAnalysis(candidates);

  await writeOutputs(serializeExecutivePledgeAnalysis(analysis));

  console.log(`Election ${electionId} executive pledge analysis complete.`);
  console.log(`Output: ${EXECUTIVE_PLEDGE_ANALYSIS_OUTPUT_DIR}`);
  console.log(`Candidates: ${analysis.summary.counts.candidateCount}`);
  console.log(`Pledges: ${analysis.summary.counts.pledgeCount}`);
  console.log(`Keywords: ${analysis.summary.counts.keywordCount}`);

  for (const sgTypecode of EXECUTIVE_SG_TYPECODES) {
    const summary = analysis.summary.counts.bySgTypecode[sgTypecode];
    console.log(
      `sgTypecode ${sgTypecode} ${summary.label}: candidates ${summary.candidateCount}, elected ${summary.electedCandidateCount}, non-elected ${summary.nonElectedCandidateCount}, pledges ${summary.pledgeCount}`
    );
  }
} finally {
  await prisma.$disconnect();
}
