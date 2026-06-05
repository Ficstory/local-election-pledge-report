import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

import { createPrismaClient } from "./create-prisma-client.mjs";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const prisma = createPrismaClient();
const electionId = process.env.NEXT_PUBLIC_DEFAULT_SG_ID?.trim() || "20260603";
const outputRoot = path.join(process.cwd(), "storage", "material-groups", electionId);

const groups = [
  {
    file: "local-heads-downloaded.jsonl",
    key: "localHeads",
    label: "LOCAL_HEADS_SG3_SG4",
    sgTypecodes: ["3", "4"]
  },
  {
    file: "education-superintendents-downloaded.jsonl",
    key: "educationSuperintendents",
    label: "EDUCATION_SUPERINTENDENTS_SG11",
    sgTypecodes: ["11"]
  }
];

function compareNullableText(left, right) {
  return (left ?? "").localeCompare(right ?? "", "ko");
}

function compareBallotNumber(left, right) {
  const leftNumber = Number(left ?? Number.POSITIVE_INFINITY);
  const rightNumber = Number(right ?? Number.POSITIVE_INFINITY);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return compareNullableText(left, right);
}

function sortRows(left, right) {
  return (
    compareNullableText(left.candidate.sgTypecode, right.candidate.sgTypecode) ||
    compareNullableText(left.candidate.regionName, right.candidate.regionName) ||
    compareNullableText(left.candidate.districtName, right.candidate.districtName) ||
    compareBallotNumber(left.candidate.ballotNumber, right.candidate.ballotNumber) ||
    compareNullableText(left.candidate.name, right.candidate.name) ||
    compareNullableText(left.materialType, right.materialType) ||
    compareNullableText(left.fileName, right.fileName)
  );
}

function increment(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function roundMb(bytes) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

function outputPathFor(file) {
  return path.posix.join("storage", "material-groups", electionId, file);
}

function absoluteStoragePath(storagePath) {
  return path.join(process.cwd(), ...storagePath.split("/"));
}

function materialRow(group, material) {
  const candidate = material.candidate;

  return {
    groupKey: group.key,
    groupLabel: group.label,
    materialId: material.id,
    materialType: material.materialType,
    title: material.title,
    fileName: material.fileName,
    fileSizeBytes: material.fileSizeBytes,
    mimeType: material.mimeType,
    sha256: material.sha256,
    sourceUrl: material.sourceUrl,
    storagePath: material.storagePath,
    candidate: {
      id: candidate.id,
      candidateApiId: candidate.candidateApiId,
      name: candidate.name,
      ballotNumber: candidate.ballotNumber,
      partyName: candidate.party?.name ?? null,
      regionName: candidate.region?.name ?? null,
      districtName: candidate.district?.name ?? null,
      sgTypecode: candidate.electionType.sgTypecode,
      electionTypeName: candidate.electionType.name
    }
  };
}

async function loadGroupMaterials(group) {
  const materials = await prisma.campaignMaterial.findMany({
    include: {
      candidate: {
        include: {
          district: true,
          electionType: true,
          party: true,
          region: true
        }
      }
    },
    where: {
      downloadStatus: "DOWNLOADED",
      storagePath: {
        not: null
      },
      candidate: {
        electionId,
        electionType: {
          sgTypecode: {
            in: group.sgTypecodes
          }
        }
      }
    }
  });

  return materials.map((material) => materialRow(group, material)).sort(sortRows);
}

async function writeGroup(group) {
  const rows = await loadGroupMaterials(group);
  const lines = rows.map((row) => JSON.stringify(row)).join("\n");
  const outputPath = path.join(outputRoot, group.file);
  const candidateIds = new Set();
  const byMaterialType = {};
  const bySgTypecode = {};
  let totalBytes = 0;
  let missingStoragePaths = 0;

  for (const row of rows) {
    candidateIds.add(row.candidate.id);
    increment(byMaterialType, row.materialType);
    increment(bySgTypecode, row.candidate.sgTypecode);
    totalBytes += row.fileSizeBytes ?? 0;

    if (!row.storagePath || !existsSync(absoluteStoragePath(row.storagePath))) {
      missingStoragePaths += 1;
    }
  }

  await writeFile(outputPath, lines ? `${lines}\n` : "");

  return {
    label: group.label,
    sgTypecodes: group.sgTypecodes,
    file: group.file,
    outputPath: outputPathFor(group.file),
    candidateCount: candidateIds.size,
    materialCount: rows.length,
    totalMB: roundMb(totalBytes),
    byMaterialType,
    bySgTypecode,
    missingStoragePaths
  };
}

try {
  await mkdir(outputRoot, { recursive: true });

  const summaries = {};

  for (const group of groups) {
    summaries[group.key] = await writeGroup(group);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    summaries
  };

  await writeFile(
    path.join(outputRoot, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`
  );

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await prisma.$disconnect();
}
