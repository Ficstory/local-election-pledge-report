import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

import { createPrismaClient } from "./create-prisma-client.mjs";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const prisma = createPrismaClient();
const defaultSummaryPath = path.join(
  process.cwd(),
  "storage",
  "analysis",
  "20260603",
  "candidate-criminal-records",
  "summary.json"
);

function parseArgs(argv) {
  const args = {};

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, value] = arg.slice(2).split("=", 2);
    args[key] = value ?? "true";
  }

  return args;
}

async function loadSummary(summaryPath) {
  const raw = await readFile(summaryPath, "utf8");
  return JSON.parse(raw);
}

async function findCandidate(record, electionId) {
  const candidateId =
    typeof record.candidateId === "string" && record.candidateId.trim()
      ? record.candidateId.trim()
      : undefined;
  const candidateApiId =
    typeof record.candidateApiId === "string" && record.candidateApiId.trim()
      ? record.candidateApiId.trim()
      : undefined;

  if (candidateId) {
    const byId = await prisma.candidate.findUnique({
      where: {
        id: candidateId
      }
    });

    if (byId) {
      return byId;
    }
  }

  if (!candidateApiId) {
    return null;
  }

  return prisma.candidate.findFirst({
    where: {
      candidateApiId,
      ...(electionId ? { electionId } : {})
    }
  });
}

function jsonArray(value) {
  return Array.isArray(value) ? value : [];
}

async function upsertDisclosure(candidateId, record, analyzedAt) {
  const data = {
    analyzedAt,
    criminalOffenses: jsonArray(record.offenses),
    criminalPunishments: jsonArray(record.punishments),
    criminalRecordCount:
      typeof record.recordCount === "number" ? record.recordCount : null,
    criminalRecordExcerpt:
      typeof record.excerpt === "string" && record.excerpt.trim()
        ? record.excerpt.trim()
        : null,
    criminalRecordStatus:
      typeof record.status === "string" && record.status.trim()
        ? record.status.trim()
        : "UNKNOWN",
    criminalRecordSummary:
      typeof record.summary === "string" && record.summary.trim()
        ? record.summary.trim()
        : null,
    pageCount: typeof record.pageCount === "number" ? record.pageCount : null,
    sourceMaterialId:
      typeof record.materialId === "string" && record.materialId.trim()
        ? record.materialId.trim()
        : null,
    sourceMaterialPath:
      typeof record.materialPath === "string" && record.materialPath.trim()
        ? record.materialPath.trim()
        : null,
    textCharCount:
      typeof record.textCharCount === "number" ? record.textCharCount : null
  };

  await prisma.candidateDisclosureAnalysis.upsert({
    create: {
      candidateId,
      ...data
    },
    update: data,
    where: {
      candidateId
    }
  });
}

const args = parseArgs(process.argv.slice(2));
const summaryPath = args.input
  ? path.resolve(process.cwd(), args.input)
  : defaultSummaryPath;

try {
  const summary = await loadSummary(summaryPath);
  const analyzedAt = summary.generatedAt ? new Date(summary.generatedAt) : new Date();
  const stats = {
    matched: 0,
    skippedMissingCandidate: 0,
    total: summary.records?.length ?? 0
  };

  for (const record of summary.records ?? []) {
    const candidate = await findCandidate(record, summary.electionId);

    if (!candidate) {
      stats.skippedMissingCandidate += 1;
      continue;
    }

    await upsertDisclosure(candidate.id, record, analyzedAt);
    stats.matched += 1;
  }

  console.log(
    `Candidate criminal record disclosures upserted: ${stats.matched}/${stats.total}`
  );

  if (stats.skippedMissingCandidate > 0) {
    console.log(
      `Skipped records without matching Candidate row: ${stats.skippedMissingCandidate}`
    );
  }
} finally {
  await prisma.$disconnect();
}
