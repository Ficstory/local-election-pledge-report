import { createHash } from "node:crypto";
import { config } from "dotenv";

import {
  buildNecApiUrl,
  getRequiredEnv,
  maskServiceKey
} from "../src/lib/nec-api.ts";
import {
  normalizeCandidateItems,
  toCandidateRecords
} from "../src/lib/nec-candidate.ts";
import { createPrismaClient } from "./create-prisma-client.mjs";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const prisma = createPrismaClient();
const source = "NEC_CANDIDATE";
const endpoint = "getPofelcddRegistSttusInfoInqire";
const electionTypeCodes = ["3", "4", "11"];
const numOfRows = 100;

const serviceKey = getRequiredEnv(process.env, "DATA_GO_KR_SERVICE_KEY");
const baseUrl = getRequiredEnv(process.env, "NEC_CANDIDATE_BASE_URL");
const electionId = getRequiredEnv(process.env, "NEXT_PUBLIC_DEFAULT_SG_ID");

function requestHash(meta) {
  return createHash("sha256").update(JSON.stringify(meta)).digest("hex");
}

function sanitizeText(text) {
  return text.replaceAll(serviceKey, "***");
}

function extractBody(payload) {
  return payload?.response?.body ?? payload?.body ?? {};
}

function requiredRecordValue(record, key) {
  const value = record[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Candidate record is missing required field: ${key}`);
  }

  return value;
}

async function fetchCandidatePage(sgTypecode, pageNo) {
  const params = {
    pageNo,
    numOfRows,
    resultType: "json",
    sgId: electionId,
    sgTypecode
  };
  const url = buildNecApiUrl({
    baseUrl,
    operation: endpoint,
    serviceKey,
    params
  });

  if (pageNo === 1) {
    console.log(`Request: ${maskServiceKey(url.toString())}`);
  }

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Candidate API failed with HTTP ${response.status}: ${sanitizeText(
        text.slice(0, 500)
      )}`
    );
  }

  let payload;

  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Expected JSON response from Candidate API but could not parse it: ${sanitizeText(
        text.slice(0, 500)
      )}`,
      { cause: error }
    );
  }

  const body = extractBody(payload);
  const items = normalizeCandidateItems(payload);

  return {
    payload,
    records: toCandidateRecords(items),
    totalCount: Number(body.totalCount ?? items.length),
    requestMeta: {
      baseUrl,
      endpoint,
      maskedUrl: maskServiceKey(url.toString()),
      params
    }
  };
}

async function upsertRegion(name) {
  if (!name) {
    return null;
  }

  return prisma.region.upsert({
    where: {
      name
    },
    create: {
      name
    },
    update: {
      name
    }
  });
}

async function upsertDistrict(regionId, name) {
  if (!regionId || !name) {
    return null;
  }

  return prisma.district.upsert({
    where: {
      regionId_name: {
        regionId,
        name
      }
    },
    create: {
      regionId,
      name
    },
    update: {
      name
    }
  });
}

async function upsertParty(name) {
  if (!name) {
    return null;
  }

  return prisma.party.upsert({
    where: {
      name
    },
    create: {
      name
    },
    update: {
      name
    }
  });
}

async function upsertCandidate(record, rawApiResponseId) {
  if (!record.candidateApiId) {
    return "skipped";
  }

  const recordElectionId = requiredRecordValue(record, "electionId");
  const sgTypecode = requiredRecordValue(record, "sgTypecode");
  const name = requiredRecordValue(record, "name");
  const electionType = await prisma.electionType.findUnique({
    where: {
      electionId_sgTypecode: {
        electionId: recordElectionId,
        sgTypecode
      }
    }
  });

  if (!electionType) {
    throw new Error(
      `Missing ElectionType for electionId=${recordElectionId}, sgTypecode=${sgTypecode}. Run db:ingest:common-code first.`
    );
  }

  const region = await upsertRegion(record.regionName);
  const district = await upsertDistrict(region?.id, record.districtName);
  const party = await upsertParty(record.partyName);
  const data = {
    regionId: region?.id ?? null,
    districtId: district?.id ?? null,
    partyId: party?.id ?? null,
    rawApiResponseId,
    name,
    ballotNumber: record.ballotNumber ?? null,
    gender: record.gender ?? null,
    age: record.age ?? null,
    job: record.job ?? null,
    education: record.education ?? null,
    career1: record.career1 ?? null,
    career2: record.career2 ?? null,
    status: record.status
  };

  await prisma.candidate.upsert({
    where: {
      electionId_electionTypeId_candidateApiId: {
        electionId: recordElectionId,
        electionTypeId: electionType.id,
        candidateApiId: record.candidateApiId
      }
    },
    create: {
      electionId: recordElectionId,
      electionTypeId: electionType.id,
      candidateApiId: record.candidateApiId,
      ...data
    },
    update: data
  });

  return "upserted";
}

async function ingestElectionType(sgTypecode) {
  const fetchRun = await prisma.fetchRun.create({
    data: {
      electionId,
      source,
      endpoint,
      electionTypeCode: sgTypecode,
      status: "RUNNING"
    }
  });

  try {
    const firstPage = await fetchCandidatePage(sgTypecode, 1);
    const pageCount = Math.max(1, Math.ceil(firstPage.totalCount / numOfRows));
    const pages = [firstPage];

    for (let pageNo = 2; pageNo <= pageCount; pageNo += 1) {
      pages.push(await fetchCandidatePage(sgTypecode, pageNo));
    }

    let rowCount = 0;
    let upsertedCount = 0;
    let skippedMissingKeyCount = 0;

    for (const page of pages) {
      const rawApiResponse = await prisma.rawApiResponse.create({
        data: {
          fetchRunId: fetchRun.id,
          source,
          endpoint,
          requestHash: requestHash(page.requestMeta),
          requestMeta: page.requestMeta,
          responseBody: page.payload
        }
      });

      rowCount += page.records.length;

      for (const record of page.records) {
        const result = await upsertCandidate(record, rawApiResponse.id);

        if (result === "upserted") {
          upsertedCount += 1;
        } else {
          skippedMissingKeyCount += 1;
        }
      }
    }

    await prisma.fetchRun.update({
      where: {
        id: fetchRun.id
      },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        rowCount
      }
    });

    return {
      sgTypecode,
      pages: pages.length,
      rowCount,
      upsertedCount,
      skippedMissingKeyCount
    };
  } catch (error) {
    await prisma.fetchRun.update({
      where: {
        id: fetchRun.id
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });

    throw error;
  }
}

try {
  const election = await prisma.election.findUnique({
    where: {
      id: electionId
    }
  });

  if (!election) {
    throw new Error(
      `Missing Election ${electionId}. Run db:ingest:common-code first.`
    );
  }

  const results = [];

  for (const sgTypecode of electionTypeCodes) {
    results.push(await ingestElectionType(sgTypecode));
  }

  const totals = results.reduce(
    (summary, result) => ({
      pages: summary.pages + result.pages,
      rowCount: summary.rowCount + result.rowCount,
      upsertedCount: summary.upsertedCount + result.upsertedCount,
      skippedMissingKeyCount:
        summary.skippedMissingKeyCount + result.skippedMissingKeyCount
    }),
    {
      pages: 0,
      rowCount: 0,
      upsertedCount: 0,
      skippedMissingKeyCount: 0
    }
  );

  for (const result of results) {
    console.log(
      `sgTypecode ${result.sgTypecode}: raw pages ${result.pages}, rows ${result.rowCount}, upserted ${result.upsertedCount}, skipped missing key ${result.skippedMissingKeyCount}`
    );
  }

  console.log(`Stored raw pages: ${totals.pages}`);
  console.log(`Candidate rows from API: ${totals.rowCount}`);
  console.log(`Upserted candidates: ${totals.upsertedCount}`);
  console.log(`Skipped candidates without stable key: ${totals.skippedMissingKeyCount}`);
} finally {
  await prisma.$disconnect();
}
