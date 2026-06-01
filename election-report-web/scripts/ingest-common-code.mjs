import { createHash } from "node:crypto";
import { config } from "dotenv";

import {
  buildNecApiUrl,
  getRequiredEnv,
  maskServiceKey
} from "../src/lib/nec-api.ts";
import {
  normalizeCommonSgCodeItems,
  toElectionTypeRecords
} from "../src/lib/nec-common-code.ts";
import { createPrismaClient } from "./create-prisma-client.mjs";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const prisma = createPrismaClient();
const source = "NEC_COMMON_CODE";
const endpoint = "getCommonSgCodeList";
const numOfRows = 100;

const serviceKey = getRequiredEnv(process.env, "DATA_GO_KR_SERVICE_KEY");
const baseUrl = getRequiredEnv(process.env, "NEC_COMMON_CODE_BASE_URL");
const defaultElectionId = process.env.NEXT_PUBLIC_DEFAULT_SG_ID?.trim();

function requestHash(meta) {
  return createHash("sha256").update(JSON.stringify(meta)).digest("hex");
}

function parseVoteDate(value) {
  return value ? new Date(`${value}T00:00:00.000+09:00`) : undefined;
}

async function fetchCommonCodePage(pageNo) {
  const params = {
    pageNo,
    numOfRows,
    resultType: "json"
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
    throw new Error(`CommonCodeService failed: ${text.slice(0, 500)}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("json")) {
    throw new Error(
      `Expected JSON response from CommonCodeService but received ${contentType}`
    );
  }

  const payload = JSON.parse(text);
  const body = payload?.response?.body ?? payload?.body ?? {};

  return {
    payload,
    items: normalizeCommonSgCodeItems(payload),
    totalCount: Number(body.totalCount ?? 0),
    requestMeta: {
      baseUrl,
      endpoint,
      maskedUrl: maskServiceKey(url.toString()),
      params
    }
  };
}

const fetchRun = await prisma.fetchRun.create({
  data: {
    source,
    endpoint,
    status: "RUNNING"
  }
});

try {
  const firstPage = await fetchCommonCodePage(1);
  const pageCount = Math.max(1, Math.ceil(firstPage.totalCount / numOfRows));
  const pages = [firstPage];

  for (let pageNo = 2; pageNo <= pageCount; pageNo += 1) {
    pages.push(await fetchCommonCodePage(pageNo));
  }

  for (const page of pages) {
    await prisma.rawApiResponse.create({
      data: {
        fetchRunId: fetchRun.id,
        source,
        endpoint,
        requestHash: requestHash(page.requestMeta),
        requestMeta: page.requestMeta,
        responseBody: page.payload
      }
    });
  }

  const items = pages.flatMap((page) => page.items);
  const records = toElectionTypeRecords(items);

  for (const record of records) {
    const voteDate = parseVoteDate(record.voteDate);
    const electionData = {
      name: record.electionName,
      ...(voteDate ? { voteDate } : {})
    };

    await prisma.election.upsert({
      where: {
        id: record.electionId
      },
      create: {
        id: record.electionId,
        ...electionData
      },
      update: electionData
    });

    await prisma.electionType.upsert({
      where: {
        electionId_sgTypecode: {
          electionId: record.electionId,
          sgTypecode: record.sgTypecode
        }
      },
      create: {
        electionId: record.electionId,
        sgTypecode: record.sgTypecode,
        name: record.name
      },
      update: {
        name: record.name
      }
    });
  }

  const defaultElectionMatches = defaultElectionId
    ? records.filter((record) => record.electionId === defaultElectionId)
    : [];

  await prisma.fetchRun.update({
    where: {
      id: fetchRun.id
    },
    data: {
      electionId: defaultElectionMatches.length > 0 ? defaultElectionId : null,
      status: "COMPLETED",
      finishedAt: new Date(),
      rowCount: items.length
    }
  });

  console.log(`Stored raw pages: ${pages.length}`);
  console.log(`Stored common-code rows: ${items.length}`);
  console.log(`Upserted election type records: ${records.length}`);

  if (defaultElectionId) {
    console.log(
      `Election types for ${defaultElectionId}: ${defaultElectionMatches.length}`
    );
  }
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
} finally {
  await prisma.$disconnect();
}
