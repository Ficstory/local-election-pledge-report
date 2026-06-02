import { createHash } from "node:crypto";
import { config } from "dotenv";

import {
  buildPolicyMaterialSubSgId,
  isPolicyMaterialElectionTypeCode,
  parsePolicyMaterialFileInfo,
  POLICY_MATERIAL_ENDPOINT_PATHS,
  POLICY_MATERIAL_ELECTION_TYPE_CODES,
  POLICY_MATERIAL_SOURCE_SYSTEM,
  POLICY_MATERIAL_WEB_BASE_URL
} from "../src/lib/nec-policy-material.ts";
import { createPrismaClient } from "./create-prisma-client.mjs";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const prisma = createPrismaClient();
const source = "POLICY_NEC_MATERIAL";
const electionId = process.env.NEXT_PUBLIC_DEFAULT_SG_ID?.trim() || "20260603";
const pageSafetyLimit = 100;

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

function selectedElectionTypes(args) {
  const requested = args["sg-typecode"]?.trim();

  if (!requested) {
    return [...POLICY_MATERIAL_ELECTION_TYPE_CODES];
  }

  if (!isPolicyMaterialElectionTypeCode(requested)) {
    throw new Error(`Unsupported --sg-typecode=${requested}. Use 3, 4, or 11.`);
  }

  return [requested];
}

function requestHash(meta) {
  return createHash("sha256").update(JSON.stringify(meta)).digest("hex");
}

function randomDelayMs() {
  return 300 + Math.floor(Math.random() * 201);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickString(row, keys) {
  for (const key of keys) {
    const value = row?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return undefined;
}

function findRows(payload, keys) {
  const lowerKeys = new Set(keys.map((key) => key.toLowerCase()));
  const queue = [payload];

  while (queue.length > 0) {
    const value = queue.shift();

    if (Array.isArray(value) || !isRecord(value)) {
      continue;
    }

    for (const [key, nested] of Object.entries(value)) {
      if (lowerKeys.has(key.toLowerCase()) && Array.isArray(nested)) {
        return nested.filter(isRecord);
      }

      if (isRecord(nested)) {
        queue.push(nested);
      }
    }
  }

  return [];
}

function totalCount(payload, rows) {
  if (isRecord(payload)) {
    const value = Number(payload.totalCnt ?? payload.totalCount);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return rows.length;
}

function sourceFileName(sourceFilePath) {
  return sourceFilePath?.split("/").filter(Boolean).at(-1) ?? null;
}

function listParams({ guId = "", pageIndex, regionId, sgTypecode, sggId = "" }) {
  return {
    elecEndYn: "N",
    hGuId: guId,
    hRegionId: regionId,
    hSggId: sggId,
    pageIndex,
    phGuId: "",
    sgId: electionId,
    sgTypecode,
    subSgId: buildPolicyMaterialSubSgId(electionId, sgTypecode)
  };
}

async function postPolicyJson(endpointKey, params) {
  const path = POLICY_MATERIAL_ENDPOINT_PATHS[endpointKey];
  const url = new URL(path, POLICY_MATERIAL_WEB_BASE_URL);
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    body.set(key, String(value));
  }

  await sleep(randomDelayMs());

  const response = await fetch(url, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    },
    method: "POST"
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `${endpointKey} failed with HTTP ${response.status}: ${text.slice(0, 300)}`
    );
  }

  let payload;

  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `${endpointKey} returned non-JSON response: ${text.slice(0, 300)}`,
      { cause: error }
    );
  }

  return {
    endpointKey,
    params,
    path,
    payload,
    requestMeta: {
      endpoint: path,
      params,
      url: url.toString()
    },
    status: response.status
  };
}

async function storeRawResponse(fetchRunId, response) {
  if (!fetchRunId) {
    return null;
  }

  return prisma.rawApiResponse.create({
    data: {
      endpoint: response.path,
      fetchRunId,
      requestHash: requestHash(response.requestMeta),
      requestMeta: response.requestMeta,
      responseBody: response.payload,
      source
    }
  });
}

async function fetchAndStore(endpointKey, params, fetchRunId, dryRun) {
  const response = await postPolicyJson(endpointKey, params);
  const rawApiResponse = dryRun
    ? null
    : await storeRawResponse(fetchRunId, response);

  return {
    rawApiResponseId: rawApiResponse?.id ?? null,
    response
  };
}

async function fetchListPages({
  fetchRunId,
  guId = "",
  regionId,
  sgTypecode,
  sggId = "",
  dryRun
}) {
  const pages = [];
  let seenRows = 0;

  for (let pageIndex = 1; pageIndex <= pageSafetyLimit; pageIndex += 1) {
    const { rawApiResponseId, response } = await fetchAndStore(
      "list",
      listParams({ guId, pageIndex, regionId, sgTypecode, sggId }),
      fetchRunId,
      dryRun
    );
    const rows = findRows(response.payload, ["list"]);
    const count = totalCount(response.payload, rows);

    pages.push({
      count,
      rawApiResponseId,
      rows
    });
    seenRows += rows.length;

    if (rows.length === 0 || seenRows >= count) {
      break;
    }
  }

  return pages;
}

async function discoverTargets({ dryRun, fetchRunId, regionFilter, sgTypecode }) {
  const subSgId = buildPolicyMaterialSubSgId(electionId, sgTypecode);
  const { response: regionResponse } = await fetchAndStore(
    "region",
    {
      sgId: electionId,
      subSgId
    },
    fetchRunId,
    dryRun
  );
  const regionRows = findRows(regionResponse.payload, [
    "regionlist",
    "regionList",
    "list"
  ]);
  const regions = regionRows
    .map((row) => ({
      id: pickString(row, ["wiwid", "wiwsidocode", "regionId", "code", "id"]),
      row
    }))
    .filter((region) => region.id && (!regionFilter || region.id === regionFilter));

  if (sgTypecode !== "4") {
    return regions.map((region) => ({
      label: `region=${region.id}`,
      regionId: region.id
    }));
  }

  const targets = [];

  for (const region of regions) {
    const { response: guResponse } = await fetchAndStore(
      "gu",
      {
        sgId: electionId,
        sortYn: "",
        subSgId,
        wiwsidocode: region.id
      },
      fetchRunId,
      dryRun
    );
    const guRows = findRows(guResponse.payload, ["gulist", "guList", "list"]);

    for (const guRow of guRows) {
      const guId = pickString(guRow, ["wiwid", "guId", "id", "code"]);

      if (!guId) {
        continue;
      }

      const { response: sggResponse } = await fetchAndStore(
        "sgg",
        {
          sgId: electionId,
          sortYn: "",
          subSgId,
          wiwid: guId,
          wiwsidocode: region.id
        },
        fetchRunId,
        dryRun
      );
      const sggRows = findRows(sggResponse.payload, [
        "sgglist",
        "sggList",
        "list"
      ]);

      for (const sggRow of sggRows) {
        const sggId = pickString(sggRow, [
          "sggid",
          "sggId",
          "hSggId",
          "wiwid",
          "id",
          "code"
        ]);

        if (!sggId) {
          continue;
        }

        targets.push({
          guId,
          label: `region=${region.id}, gu=${guId}, sgg=${sggId}`,
          regionId: region.id,
          sggId
        });
      }
    }
  }

  return targets;
}

async function fetchCandidateMap(sgTypecode) {
  const candidates = await prisma.candidate.findMany({
    orderBy: {
      candidateApiId: "asc"
    },
    select: {
      candidateApiId: true,
      id: true
    },
    where: {
      candidateApiId: {
        not: null
      },
      electionId,
      electionType: {
        sgTypecode
      }
    }
  });

  return new Map(
    candidates
      .filter((candidate) => candidate.candidateApiId)
      .map((candidate) => [candidate.candidateApiId, candidate.id])
  );
}

async function upsertMaterial(candidateId, material) {
  const existing = await prisma.campaignMaterial.findUnique({
    where: {
      sourceSystem_sourceMaterialId: {
        sourceMaterialId: material.sourceMaterialId,
        sourceSystem: POLICY_MATERIAL_SOURCE_SYSTEM
      }
    }
  });
  const downloadStatus = !material.sourceUrl
    ? "SKIPPED_NO_URL"
    : existing?.downloadStatus === "DOWNLOADED"
      ? "DOWNLOADED"
      : "METADATA_ONLY";
  const data = {
    candidateId,
    downloadStatus,
    errorMessage: null,
    fileName: sourceFileName(material.sourceFilePath),
    materialType: material.materialType,
    metadataCollectedAt: new Date(),
    sourceFilePath: material.sourceFilePath,
    sourceMaterialId: material.sourceMaterialId,
    sourceSystem: POLICY_MATERIAL_SOURCE_SYSTEM,
    sourceUrl: material.sourceUrl,
    title: material.title
  };

  await prisma.campaignMaterial.upsert({
    create: data,
    update: data,
    where: {
      sourceSystem_sourceMaterialId: {
        sourceMaterialId: material.sourceMaterialId,
        sourceSystem: POLICY_MATERIAL_SOURCE_SYSTEM
      }
    }
  });

  return existing ? "updated" : "created";
}

async function ingestElectionType(sgTypecode, args) {
  const dryRun = args["dry-run"] === "true";
  const regionFilter = args.region?.trim();
  const limitCandidates = Number(args["limit-candidates"]);
  const candidateLimit =
    Number.isFinite(limitCandidates) && limitCandidates > 0
      ? limitCandidates
      : undefined;
  const fetchRun = dryRun
    ? null
    : await prisma.fetchRun.create({
        data: {
          electionId,
          endpoint: "policy-materials",
          electionTypeCode: sgTypecode,
          source,
          status: "RUNNING"
        }
      });

  try {
    const candidateMap = dryRun ? new Map() : await fetchCandidateMap(sgTypecode);
    const targets = await discoverTargets({
      dryRun,
      fetchRunId: fetchRun?.id,
      regionFilter,
      sgTypecode
    });
    const processedCandidateApiIds = new Set();
    const summary = {
      created: 0,
      listRows: 0,
      matchedCandidates: 0,
      rawPages: 0,
      skippedMissingCandidateApiId: 0,
      skippedNoCandidateMatch: 0,
      updated: 0
    };

    for (const target of targets) {
      if (candidateLimit && processedCandidateApiIds.size >= candidateLimit) {
        break;
      }

      const pages = await fetchListPages({
        dryRun,
        fetchRunId: fetchRun?.id,
        guId: target.guId,
        regionId: target.regionId,
        sgTypecode,
        sggId: target.sggId
      });

      summary.rawPages += pages.length;

      for (const page of pages) {
        for (const row of page.rows) {
          if (candidateLimit && processedCandidateApiIds.size >= candidateLimit) {
            break;
          }

          summary.listRows += 1;

          const candidateApiId = pickString(row, ["huboid"]);

          if (!candidateApiId) {
            summary.skippedMissingCandidateApiId += 1;
            continue;
          }

          processedCandidateApiIds.add(candidateApiId);

          if (dryRun) {
            const materials = parsePolicyMaterialFileInfo({
              candidateApiId,
              fileinfo: typeof row.fileinfo === "string" ? row.fileinfo : null,
              sgId: pickString(row, ["sgId"]) ?? electionId,
              sgTypecode
            });

            console.log(
              `[dry-run] ${sgTypecode} ${candidateApiId}: ${materials.length} material rows`
            );
            continue;
          }

          const candidateId = candidateMap.get(candidateApiId);

          if (!candidateId) {
            summary.skippedNoCandidateMatch += 1;
            continue;
          }

          summary.matchedCandidates += 1;

          const materials = parsePolicyMaterialFileInfo({
            candidateApiId,
            fileinfo: typeof row.fileinfo === "string" ? row.fileinfo : null,
            sgId: pickString(row, ["sgId"]) ?? electionId,
            sgTypecode
          });

          for (const material of materials) {
            const result = await upsertMaterial(candidateId, material);

            if (result === "created") {
              summary.created += 1;
            } else {
              summary.updated += 1;
            }
          }
        }
      }
    }

    if (fetchRun) {
      await prisma.fetchRun.update({
        data: {
          finishedAt: new Date(),
          rowCount: summary.created + summary.updated,
          status: "COMPLETED"
        },
        where: {
          id: fetchRun.id
        }
      });
    }

    return {
      ...summary,
      candidates: processedCandidateApiIds.size,
      dryRun,
      sgTypecode,
      targets: targets.length
    };
  } catch (error) {
    if (fetchRun) {
      await prisma.fetchRun.update({
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
          finishedAt: new Date(),
          status: "FAILED"
        },
        where: {
          id: fetchRun.id
        }
      });
    }

    throw error;
  }
}

const args = parseArgs(process.argv.slice(2));

try {
  const results = [];

  for (const sgTypecode of selectedElectionTypes(args)) {
    results.push(await ingestElectionType(sgTypecode, args));
  }

  for (const result of results) {
    console.log(
      [
        `sgTypecode ${result.sgTypecode}`,
        `targets ${result.targets}`,
        `raw pages ${result.rawPages}`,
        `list rows ${result.listRows}`,
        `candidates ${result.candidates}`,
        `matched ${result.matchedCandidates}`,
        `created ${result.created}`,
        `updated ${result.updated}`,
        `skipped missing huboid ${result.skippedMissingCandidateApiId}`,
        `skipped no candidate match ${result.skippedNoCandidateMatch}`,
        `dryRun ${result.dryRun}`
      ].join(", ")
    );
  }
} finally {
  await prisma.$disconnect();
}
