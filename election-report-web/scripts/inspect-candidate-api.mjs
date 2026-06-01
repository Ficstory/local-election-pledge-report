import { config } from "dotenv";

import {
  buildNecApiUrl,
  getRequiredEnv,
  maskServiceKey
} from "../src/lib/nec-api.ts";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const endpoint = "getPofelcddRegistSttusInfoInqire";
const electionTypeCodes = ["3", "4", "11"];
const numOfRows = 100;

const serviceKey = getRequiredEnv(process.env, "DATA_GO_KR_SERVICE_KEY");
const baseUrl = getRequiredEnv(process.env, "NEC_CANDIDATE_BASE_URL");
const electionId = getRequiredEnv(process.env, "NEXT_PUBLIC_DEFAULT_SG_ID");

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function extractHeader(payload) {
  return (
    payload?.response?.header ??
    payload?.[endpoint]?.header ??
    payload?.header ??
    {}
  );
}

function extractBody(payload) {
  return (
    payload?.response?.body ?? payload?.[endpoint]?.body ?? payload?.body ?? {}
  );
}

function extractItems(payload) {
  const body = extractBody(payload);
  return asArray(body?.items?.item ?? body?.item);
}

function redactValue(key, value) {
  if (typeof value === "string" && key.toLowerCase().includes("servicekey")) {
    return "***";
  }

  const sensitiveFields = new Set(["addr", "birthday"]);

  if (sensitiveFields.has(key)) {
    return value ? "[redacted]" : value;
  }

  return value;
}

function sanitizeRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, redactValue(key, value)])
  );
}

function sanitizeText(text) {
  return text.replaceAll(serviceKey, "***");
}

function fieldNames(rows) {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
}

async function fetchCandidatePage(sgTypecode) {
  const params = {
    pageNo: 1,
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

  console.log(`Request: ${maskServiceKey(url.toString())}`);

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Candidate API failed with HTTP ${response.status}: ${sanitizeText(
        text.slice(0, 500)
      )}`
    );
  }

  try {
    return {
      payload: JSON.parse(text),
      status: response.status
    };
  } catch (error) {
    throw new Error(
      `Expected JSON response from Candidate API but could not parse it: ${sanitizeText(
        text.slice(0, 500)
      )}`,
      { cause: error }
    );
  }
}

for (const sgTypecode of electionTypeCodes) {
  console.log("");
  console.log(`=== sgId=${electionId}, sgTypecode=${sgTypecode} ===`);

  const { payload, status } = await fetchCandidatePage(sgTypecode);
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
