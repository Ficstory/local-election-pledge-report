import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

import { createPrismaClient } from "./create-prisma-client.mjs";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const prisma = createPrismaClient();
const storageRoot = path.join(process.cwd(), "storage", "materials");

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

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function safePathSegment(value, fallback) {
  const segment = value
    ?.trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\.+$/g, "")
    .trim();

  return segment || fallback;
}

function fileNameFromMaterial(material) {
  if (material.fileName) {
    return safePathSegment(material.fileName, `${material.id}.pdf`);
  }

  if (material.sourceUrl) {
    const url = new URL(material.sourceUrl);
    const pathnameName = path.posix.basename(url.pathname);

    return safePathSegment(pathnameName, `${material.id}.pdf`);
  }

  return `${material.id}.pdf`;
}

function relativeStoragePath(absolutePath) {
  return path.relative(process.cwd(), absolutePath).split(path.sep).join("/");
}

async function fetchPdf(material) {
  const response = await fetch(material.sourceUrl);

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `HTTP ${response.status}: ${text.slice(0, 300) || response.statusText}`
    );
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type") ?? "application/pdf"
  };
}

async function loadOrDownload(material, absolutePath) {
  if (existsSync(absolutePath)) {
    return {
      bytes: await readFile(absolutePath),
      downloaded: false,
      mimeType: material.mimeType ?? "application/pdf"
    };
  }

  const result = await fetchPdf(material);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, result.bytes);

  return {
    ...result,
    downloaded: true
  };
}

async function downloadMaterial(material) {
  const electionId = safePathSegment(
    material.candidate.electionId,
    process.env.NEXT_PUBLIC_DEFAULT_SG_ID?.trim() || "20260603"
  );
  const candidateApiId = safePathSegment(
    material.candidate.candidateApiId,
    material.candidate.id
  );
  const fileName = fileNameFromMaterial(material);
  const absolutePath = path.join(storageRoot, electionId, candidateApiId, fileName);
  const result = await loadOrDownload(material, absolutePath);

  await prisma.campaignMaterial.update({
    data: {
      collectedAt: new Date(),
      downloadStatus: "DOWNLOADED",
      errorMessage: null,
      fileName,
      fileSizeBytes: result.bytes.length,
      mimeType: result.mimeType,
      sha256: sha256(result.bytes),
      storagePath: relativeStoragePath(absolutePath)
    },
    where: {
      id: material.id
    }
  });

  return {
    bytes: result.bytes.length,
    downloaded: result.downloaded,
    fileName,
    storagePath: relativeStoragePath(absolutePath)
  };
}

async function markFailed(material, error) {
  await prisma.campaignMaterial.update({
    data: {
      downloadStatus: "FAILED",
      errorMessage: error instanceof Error ? error.message : String(error)
    },
    where: {
      id: material.id
    }
  });
}

async function fetchMaterials(args) {
  const limit = Number(args.limit);
  const take = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : undefined;

  return prisma.campaignMaterial.findMany({
    include: {
      candidate: {
        select: {
          candidateApiId: true,
          electionId: true,
          id: true
        }
      }
    },
    orderBy: [
      {
        metadataCollectedAt: "asc"
      },
      {
        createdAt: "asc"
      }
    ],
    take,
    where: {
      downloadStatus: "METADATA_ONLY",
      sourceUrl: {
        not: null
      }
    }
  });
}

const args = parseArgs(process.argv.slice(2));

try {
  const materials = await fetchMaterials(args);
  const summary = {
    downloaded: 0,
    failed: 0,
    reusedExisting: 0
  };

  console.log(`Download targets: ${materials.length}`);

  for (const material of materials) {
    try {
      const result = await downloadMaterial(material);

      if (result.downloaded) {
        summary.downloaded += 1;
      } else {
        summary.reusedExisting += 1;
      }

      console.log(
        `${material.id}: ${result.downloaded ? "downloaded" : "reused"} ${result.storagePath} (${result.bytes} bytes)`
      );
    } catch (error) {
      summary.failed += 1;
      await markFailed(material, error);
      console.log(
        `${material.id}: failed ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log(
    `Downloaded ${summary.downloaded}, reused existing ${summary.reusedExisting}, failed ${summary.failed}`
  );
} finally {
  await prisma.$disconnect();
}
