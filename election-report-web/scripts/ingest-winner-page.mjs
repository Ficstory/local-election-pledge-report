import { createHash } from "node:crypto";
import { config } from "dotenv";

import { createPrismaClient } from "./create-prisma-client.mjs";
import {
  NEC_WINNER_PAGE_ENDPOINT,
  NEC_WINNER_PAGE_SOURCE,
  buildWinnerPageMainUrl,
  buildWinnerPageRequestParams,
  parseNecWinnerPage
} from "../src/lib/nec-winner-page.ts";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const prisma = createPrismaClient();
const endpoint = "electionInfo_report.xhtml";
const electionId = process.env.NEXT_PUBLIC_DEFAULT_SG_ID?.trim() || "20260603";
const args = process.argv.slice(2);
const noMarkNonWinners = args.includes("--no-mark-non-winners");

function argValue(name) {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

const electionTypeCodes = (argValue("--sg-typecode") ?? "11")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function requestHash(meta) {
  return createHash("sha256").update(JSON.stringify(meta)).digest("hex");
}

function cookieHeader(response) {
  return (response.headers.getSetCookie?.() ?? [])
    .map((value) => value.split(";")[0])
    .join("; ");
}

function parseCityOptions(html) {
  const selectHtml =
    html.match(/<select[^>]+id=["']cityCode["'][\s\S]*?<\/select>/i)?.[0] ?? "";

  return [
    ...selectHtml.matchAll(
      /<option[^>]+value=["']([^"']+)["'][^>]*>([\s\S]*?)<\/option>/gi
    )
  ]
    .map((match) => ({
      code: match[1]?.trim(),
      name: (match[2] ?? "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    }))
    .filter((option) => option.code && option.code !== "-1");
}

async function fetchMainPage() {
  const mainUrl = buildWinnerPageMainUrl(electionId);
  const mainResponse = await fetch(mainUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 Codex winner ingestion"
    }
  });

  if (!mainResponse.ok) {
    throw new Error(`Winner main page failed with HTTP ${mainResponse.status}`);
  }

  return {
    cookie: cookieHeader(mainResponse),
    html: await mainResponse.text(),
    mainUrl
  };
}

async function fetchWinnerPage({ cityCode = "-1", cookie, mainUrl, sgTypecode }) {
  const params = buildWinnerPageRequestParams({
    cityCode,
    electionId,
    sgTypecode
  });
  const response = await fetch(NEC_WINNER_PAGE_ENDPOINT, {
    body: params,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
      Referer: mainUrl,
      "User-Agent": "Mozilla/5.0 Codex winner ingestion"
    },
    method: "POST"
  });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(
      `Winner page failed with HTTP ${response.status}: ${html.slice(0, 500)}`
    );
  }

  const records = parseNecWinnerPage(html);

  return {
    cityCode,
    html,
    records,
    requestMeta: {
      endpoint: NEC_WINNER_PAGE_ENDPOINT,
      mainUrl,
      params: Object.fromEntries(params.entries())
    }
  };
}

async function fetchWinnerPages(sgTypecode) {
  const mainPage = await fetchMainPage();
  const cityOptions =
    sgTypecode === "4" ? parseCityOptions(mainPage.html) : [{ code: "-1" }];
  const pages = [];

  if (cityOptions.length === 0) {
    throw new Error("Could not find cityCode options on winner main page.");
  }

  for (const cityOption of cityOptions) {
    const page = await fetchWinnerPage({
      cityCode: cityOption.code,
      cookie: mainPage.cookie,
      mainUrl: mainPage.mainUrl,
      sgTypecode
    });

    pages.push({
      ...page,
      cityName: cityOption.name
    });
  }

  const rowCount = pages.reduce((sum, page) => sum + page.records.length, 0);

  if (rowCount === 0) {
    throw new Error(
      `Winner page returned no parseable rows for electionId=${electionId}, sgTypecode=${sgTypecode}`
    );
  }

  return pages;
}

async function fetchCandidateMatches(sgTypecode, winnerRecords) {
  const candidateApiIds = winnerRecords.map((record) => record.candidateApiId);
  const candidates = await prisma.candidate.findMany({
    where: {
      candidateApiId: {
        in: candidateApiIds
      },
      electionId,
      electionType: {
        sgTypecode
      }
    },
    select: {
      candidateApiId: true,
      id: true,
      name: true,
      region: {
        select: {
          name: true
        }
      }
    }
  });

  return new Map(candidates.map((candidate) => [candidate.candidateApiId, candidate]));
}

async function storeWinnerResults({
  rawApiResponseId,
  sgTypecode,
  winnerRecords
}) {
  const candidatesByApiId = await fetchCandidateMatches(sgTypecode, winnerRecords);
  const unmatched = winnerRecords.filter(
    (record) => !candidatesByApiId.has(record.candidateApiId)
  );

  if (unmatched.length > 0) {
    throw new Error(
      `Winner records without matching Candidate rows: ${unmatched
        .map((record) => `${record.regionName}/${record.name}/${record.candidateApiId}`)
        .join(", ")}`
    );
  }

  const winnerApiIds = winnerRecords.map((record) => record.candidateApiId);
  let winnerUpsertedCount = 0;
  let nonWinnerUpsertedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const record of winnerRecords) {
      const candidate = candidatesByApiId.get(record.candidateApiId);

      await tx.electionResult.upsert({
        where: {
          candidateId: candidate.id
        },
        create: {
          candidateId: candidate.id,
          elected: true,
          electionId,
          rank: 1,
          sourceRawApiResponseId: rawApiResponseId,
          voteCount: record.voteCount,
          voteRate: record.voteRate
        },
        update: {
          elected: true,
          rank: 1,
          sourceRawApiResponseId: rawApiResponseId,
          voteCount: record.voteCount,
          voteRate: record.voteRate
        }
      });
      winnerUpsertedCount += 1;
    }

    if (!noMarkNonWinners) {
      const nonWinners = await tx.candidate.findMany({
        where: {
          electionId,
          electionType: {
            sgTypecode
          },
          NOT: {
            candidateApiId: {
              in: winnerApiIds
            }
          }
        },
        select: {
          id: true
        }
      });

      for (const candidate of nonWinners) {
        await tx.electionResult.upsert({
          where: {
            candidateId: candidate.id
          },
          create: {
            candidateId: candidate.id,
            elected: false,
            electionId,
            sourceRawApiResponseId: rawApiResponseId
          },
          update: {
            elected: false,
            rank: null,
            sourceRawApiResponseId: rawApiResponseId,
            voteCount: null,
            voteRate: null
          }
        });
        nonWinnerUpsertedCount += 1;
      }
    }
  });

  return {
    nonWinnerUpsertedCount,
    unmatchedCount: unmatched.length,
    winnerUpsertedCount
  };
}

async function ingestElectionType(sgTypecode) {
  const fetchRun = await prisma.fetchRun.create({
    data: {
      electionId,
      electionTypeCode: sgTypecode,
      endpoint,
      source: NEC_WINNER_PAGE_SOURCE,
      status: "RUNNING"
    }
  });

  try {
    const pages = await fetchWinnerPages(sgTypecode);
    const winnerRecords = pages.flatMap((page) => page.records);
    const requestMeta = {
      endpoint: NEC_WINNER_PAGE_ENDPOINT,
      pages: pages.map((page) => page.requestMeta)
    };
    const rawApiResponse = await prisma.rawApiResponse.create({
      data: {
        endpoint,
        fetchRunId: fetchRun.id,
        requestHash: requestHash(requestMeta),
        requestMeta,
        responseBody: {
          pages: pages.map((page) => ({
            cityCode: page.cityCode,
            cityName: page.cityName,
            html: page.html,
            records: page.records
          })),
          records: winnerRecords
        },
        source: NEC_WINNER_PAGE_SOURCE
      }
    });
    const result = await storeWinnerResults({
      rawApiResponseId: rawApiResponse.id,
      sgTypecode,
      winnerRecords
    });

    await prisma.fetchRun.update({
      data: {
        finishedAt: new Date(),
        rowCount: winnerRecords.length,
        status: "COMPLETED"
      },
      where: {
        id: fetchRun.id
      }
    });

    return {
      rawApiResponseId: rawApiResponse.id,
      pageCount: pages.length,
      rowCount: winnerRecords.length,
      sgTypecode,
      ...result
    };
  } catch (error) {
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
    console.log(
      `Fetching winner page for electionId=${electionId}, sgTypecode=${sgTypecode}`
    );
    results.push(await ingestElectionType(sgTypecode));
  }

  for (const result of results) {
    console.log(
      `sgTypecode ${result.sgTypecode}: pages ${result.pageCount}, winners ${result.rowCount}, winner results ${result.winnerUpsertedCount}, non-winner results ${result.nonWinnerUpsertedCount}, unmatched ${result.unmatchedCount}`
    );
  }
} finally {
  await prisma.$disconnect();
}
