import { config } from "dotenv";
import {
  buildNecApiUrl,
  getRequiredEnv,
  maskServiceKey
} from "../src/lib/nec-api.ts";

config({ path: ".env.local", quiet: true });

const serviceKey = getRequiredEnv(process.env, "DATA_GO_KR_SERVICE_KEY");
const baseUrl = getRequiredEnv(process.env, "NEC_COMMON_CODE_BASE_URL");
const defaultElectionId = process.env.NEXT_PUBLIC_DEFAULT_SG_ID?.trim();

async function fetchCommonCodePage(pageNo) {
  const url = buildNecApiUrl({
    baseUrl,
    operation: "getCommonSgCodeList",
    serviceKey,
    params: {
      pageNo,
      numOfRows: 100,
      resultType: "json"
    }
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
    console.log(text.slice(0, 1000));
    throw new Error(`Expected JSON response but received ${contentType}`);
  }

  const payload = JSON.parse(text);
  const header = payload?.response?.header ?? payload?.header;
  const body = payload?.response?.body ?? payload?.body;
  const items = body?.items?.item ?? body?.item ?? [];

  return {
    header,
    body,
    items: Array.isArray(items) ? items : [items].filter(Boolean)
  };
}

const firstPage = await fetchCommonCodePage(1);
const totalCount = Number(firstPage.body?.totalCount ?? firstPage.items.length);
const pageCount = Math.max(1, Math.ceil(totalCount / 100));
const allItems = [...firstPage.items];

for (let pageNo = 2; pageNo <= pageCount; pageNo += 1) {
  const page = await fetchCommonCodePage(pageNo);
  allItems.push(...page.items);
}

console.log(`Status: 200`);
console.log(`Result code: ${firstPage.header?.resultCode ?? "unknown"}`);
console.log(`Result message: ${firstPage.header?.resultMsg ?? "unknown"}`);
console.log(`Total count: ${totalCount}`);
console.log(`Fetched rows: ${allItems.length}`);

for (const item of allItems.slice(0, 3)) {
  console.log(JSON.stringify(item));
}

if (defaultElectionId) {
  const matches = allItems.filter((item) => item.sgId === defaultElectionId);

  console.log(`Matches for ${defaultElectionId}: ${matches.length}`);

  for (const item of matches) {
    console.log(JSON.stringify(item));
  }
}
