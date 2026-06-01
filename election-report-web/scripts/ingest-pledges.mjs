import { createHash } from "node:crypto";
import { config } from "dotenv";

import {
  buildNecApiUrl,
  getRequiredEnv,
  maskServiceKey
} from "../src/lib/nec-api.ts";
import { normalizePledgeItems, toPledgeRecords } from "../src/lib/nec-pledge.ts";
import { createPrismaClient } from "./create-prisma-client.mjs";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const prisma = createPrismaClient();
const source = "NEC_PLEDGE";
const endpoint = "getCnddtElecPrmsInfoInqire";
const electionTypeCodes = ["3", "4", "11"];
const numOfRows = 100;

const serviceKey = getRequiredEnv(process.env, "DATA_GO_KR_SERVICE_KEY");
const baseUrl = getRequiredEnv(process.env, "NEC_PLEDGE_BASE_URL");
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

async function fetchPledgePage(candidate, pageNo) {
  const params = {
    pageNo,
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

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Pledge API failed with HTTP ${response.status}: ${sanitizeText(
        text.slice(0, 500)
      )}`
    );
  }

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

  const body = extractBody(payload);
  const items = normalizePledgeItems(payload);

  return {
    payload,
    records: toPledgeRecords(items),
    totalCount: Number(body.totalCount ?? items.length),
    requestMeta: {
      baseUrl,
      endpoint,
      maskedUrl: maskServiceKey(url.toString()),
      params
    }
  };
}

async function fetchCandidatePledgePages(candidate) {
  const firstPage = await fetchPledgePage(candidate, 1);
  const pageCount = Math.max(1, Math.ceil(firstPage.totalCount / numOfRows));
  const pages = [firstPage];

  for (let pageNo = 2; pageNo <= pageCount; pageNo += 1) {
    pages.push(await fetchPledgePage(candidate, pageNo));
  }

  return pages;
}

async function fetchCandidates(sgTypecode) {
  return prisma.candidate.findMany({
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
      id: true,
      electionId: true,
      candidateApiId: true,
      name: true,
      electionType: {
        select: {
          sgTypecode: true,
          name: true
        }
      }
    },
    orderBy: {
      candidateApiId: "asc"
    }
  });
}

async function storeCandidatePledges(candidate, fetchRunId) {
  const pages = await fetchCandidatePledgePages(candidate);
  const pledgeInputs = [];

  for (const page of pages) {
    const rawApiResponse = await prisma.rawApiResponse.create({
      data: {
        fetchRunId,
        source,
        endpoint,
        requestHash: requestHash(page.requestMeta),
        requestMeta: page.requestMeta,
        responseBody: page.payload
      }
    });

    for (const record of page.records) {
      pledgeInputs.push({
        candidateId: candidate.id,
        rawApiResponseId: rawApiResponse.id,
        title: record.title,
        summary: record.summary ?? null,
        category: record.category ?? null,
        priority: record.priority ?? null,
        details: record.details
      });
    }
  }

  await prisma.$transaction([
    prisma.pledge.deleteMany({
      where: {
        candidateId: candidate.id
      }
    }),
    ...pledgeInputs.map((data) =>
      prisma.pledge.create({
        data
      })
    )
  ]);

  return {
    rawPages: pages.length,
    pledgeCount: pledgeInputs.length
  };
}

async function ingestElectionType(sgTypecode) {
  const candidates = await fetchCandidates(sgTypecode);
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
    let rawPages = 0;
    let pledgeCount = 0;
    let processedCandidates = 0;

    console.log(
      `sgTypecode ${sgTypecode}: fetching pledges for ${candidates.length} candidates`
    );

    for (const candidate of candidates) {
      const result = await storeCandidatePledges(candidate, fetchRun.id);

      rawPages += result.rawPages;
      pledgeCount += result.pledgeCount;
      processedCandidates += 1;

      if (processedCandidates % 50 === 0) {
        console.log(
          `sgTypecode ${sgTypecode}: processed ${processedCandidates}/${candidates.length}`
        );
      }
    }

    await prisma.fetchRun.update({
      where: {
        id: fetchRun.id
      },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        rowCount: pledgeCount
      }
    });

    return {
      sgTypecode,
      candidates: candidates.length,
      rawPages,
      pledgeCount
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
      candidates: summary.candidates + result.candidates,
      rawPages: summary.rawPages + result.rawPages,
      pledgeCount: summary.pledgeCount + result.pledgeCount
    }),
    {
      candidates: 0,
      rawPages: 0,
      pledgeCount: 0
    }
  );

  for (const result of results) {
    console.log(
      `sgTypecode ${result.sgTypecode}: candidates ${result.candidates}, raw pages ${result.rawPages}, pledges ${result.pledgeCount}`
    );
  }

  console.log(`Processed candidates: ${totals.candidates}`);
  console.log(`Stored raw pages: ${totals.rawPages}`);
  console.log(`Stored pledges: ${totals.pledgeCount}`);
} finally {
  await prisma.$disconnect();
}
