import { config } from "dotenv";

import {
  buildNecApiUrl,
  getRequiredEnv,
  maskServiceKey
} from "../src/lib/nec-api.ts";
import { createPrismaClient } from "./create-prisma-client.mjs";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const prisma = createPrismaClient();
const endpoint = "getCnddtElecPrmsInfoInqire";
const electionTypeCodes = ["3", "4", "11"];
const numOfRows = 100;

const serviceKey = getRequiredEnv(process.env, "DATA_GO_KR_SERVICE_KEY");
const baseUrl = getRequiredEnv(process.env, "NEC_PLEDGE_BASE_URL");
const electionId = getRequiredEnv(process.env, "NEXT_PUBLIC_DEFAULT_SG_ID");

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function extractHeader(payload) {
  return payload?.response?.header ?? payload?.header ?? {};
}

function extractBody(payload) {
  return payload?.response?.body ?? payload?.body ?? {};
}

function extractItems(payload) {
  const body = extractBody(payload);
  return asArray(body?.items?.item ?? body?.item);
}

function sanitizeText(text) {
  return text.replaceAll(serviceKey, "***");
}

function sanitizeRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === "string" ? sanitizeText(value) : value
    ])
  );
}

function fieldNames(rows) {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
}

async function findSampleCandidate(sgTypecode) {
  return prisma.candidate.findFirst({
    where: {
      electionId,
      candidateApiId: {
        not: null
      },
      electionType: {
        sgTypecode
      }
    },
    select: {
      candidateApiId: true,
      name: true,
      electionId: true,
      electionType: {
        select: {
          sgTypecode: true,
          name: true
        }
      },
      party: {
        select: {
          name: true
        }
      },
      region: {
        select: {
          name: true
        }
      },
      district: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      candidateApiId: "asc"
    }
  });
}

async function fetchPledgePage(candidate) {
  const params = {
    pageNo: 1,
    numOfRows,
    resultType: "json",
    sgId: candidate.electionId,
    sgTypecode: candidate.electionType.sgTypecode,
    cnddtId: candidate.candidateApiId
  };
  const url = buildNecApiUrl({
    baseUrl,
    operation: endpoint,
    serviceKey,
    params
  });

  console.log(`Request: ${maskServiceKey(url.toString())}`);

  const response = await fetch(url);
  const text = await response.text();

  if (response.ok) {
    let payload;

    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error(
        `Expected JSON response from Pledge API but could not parse it: ${sanitizeText(
          text.slice(0, 500)
        )}`,
        { cause: error }
      );
    }

    return {
      payload,
      status: response.status,
      errorText: undefined
    };
  }

  return {
    payload: undefined,
    status: response.status,
    errorText: sanitizeText(text.slice(0, 500))
  };
}

try {
  for (const sgTypecode of electionTypeCodes) {
    const candidate = await findSampleCandidate(sgTypecode);

    if (!candidate?.candidateApiId) {
      throw new Error(
        `No stored candidate with candidateApiId for electionId=${electionId}, sgTypecode=${sgTypecode}. Run db:ingest:candidates first.`
      );
    }

    console.log("");
    console.log(
      `=== sgId=${candidate.electionId}, sgTypecode=${sgTypecode}, cnddtId=${candidate.candidateApiId} ===`
    );
    console.log(
      `Candidate: ${candidate.name} / ${candidate.electionType.name} / ${
        candidate.region?.name ?? "unknown region"
      } / ${candidate.district?.name ?? "no district"} / ${
        candidate.party?.name ?? "no party"
      }`
    );

    const { errorText, payload, status } = await fetchPledgePage(candidate);

    if (!payload) {
      console.log(`HTTP status: ${status}`);
      console.log(`Error response: ${errorText ?? "unknown"}`);
      continue;
    }

    const header = extractHeader(payload);
    const body = extractBody(payload);
    const items = extractItems(payload);
    const detectedFieldNames = fieldNames(items);

    console.log(`HTTP status: ${status}`);
    console.log(`Result code: ${header?.resultCode ?? "unknown"}`);
    console.log(`Result message: ${header?.resultMsg ?? "unknown"}`);
    console.log(`Total count: ${Number(body?.totalCount ?? items.length)}`);
    console.log(`Sample row count: ${items.slice(0, 3).length}`);
    console.log(`Detected field names: ${detectedFieldNames.join(", ")}`);

    for (const item of items.slice(0, 3)) {
      console.log(JSON.stringify(sanitizeRow(item)));
    }
  }

  console.log("");
  console.log(
    "Linkage assumption: pledge lookup is candidate-level because the API requires cnddtId with sgId and sgTypecode."
  );
} finally {
  await prisma.$disconnect();
}
