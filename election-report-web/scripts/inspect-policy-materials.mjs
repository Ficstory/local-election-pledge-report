import { config } from "dotenv";

import {
  buildPolicyMaterialSubSgId,
  isPolicyMaterialElectionTypeCode,
  parsePolicyMaterialFileInfo,
  POLICY_MATERIAL_ENDPOINT_PATHS,
  POLICY_MATERIAL_ELECTION_TYPE_CODES,
  POLICY_MATERIAL_WEB_BASE_URL
} from "../src/lib/nec-policy-material.ts";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

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

    if (Array.isArray(value)) {
      continue;
    }

    if (!isRecord(value)) {
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

function fieldNames(rows) {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
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

  try {
    return {
      endpointKey,
      params,
      path,
      payload: JSON.parse(text),
      status: response.status
    };
  } catch (error) {
    throw new Error(
      `${endpointKey} returned non-JSON response: ${text.slice(0, 300)}`,
      { cause: error }
    );
  }
}

async function headPdf(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });

    return {
      contentLength: response.headers.get("content-length"),
      contentType: response.headers.get("content-type"),
      status: response.status
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      status: "ERROR"
    };
  }
}

async function fetchListPages({ guId = "", regionId, sgTypecode, sggId = "" }) {
  const pages = [];
  let seenRows = 0;

  for (let pageIndex = 1; pageIndex <= pageSafetyLimit; pageIndex += 1) {
    const page = await postPolicyJson(
      "list",
      listParams({ guId, pageIndex, regionId, sgTypecode, sggId })
    );
    const rows = findRows(page.payload, ["list"]);
    const count = totalCount(page.payload, rows);

    pages.push({
      count,
      page,
      rows
    });
    seenRows += rows.length;

    if (rows.length === 0 || seenRows >= count) {
      break;
    }
  }

  return pages;
}

async function discoverTargets(sgTypecode, regionFilter) {
  const subSgId = buildPolicyMaterialSubSgId(electionId, sgTypecode);
  const regionResponse = await postPolicyJson("region", {
    sgId: electionId,
    subSgId
  });
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
    return {
      endpointRows: [{ endpoint: "region", rows: regionRows }],
      targets: regions.map((region) => ({
        label: `region=${region.id}`,
        regionId: region.id
      }))
    };
  }

  const endpointRows = [{ endpoint: "region", rows: regionRows }];
  const targets = [];

  for (const region of regions) {
    const guResponse = await postPolicyJson("gu", {
      sgId: electionId,
      sortYn: "",
      subSgId,
      wiwsidocode: region.id
    });
    const guRows = findRows(guResponse.payload, ["gulist", "guList", "list"]);

    endpointRows.push({ endpoint: "gu", rows: guRows });

    for (const guRow of guRows) {
      const guId = pickString(guRow, ["wiwid", "guId", "id", "code"]);

      if (!guId) {
        continue;
      }

      const sggResponse = await postPolicyJson("sgg", {
        sgId: electionId,
        sortYn: "",
        subSgId,
        wiwid: guId,
        wiwsidocode: region.id
      });
      const sggRows = findRows(sggResponse.payload, [
        "sgglist",
        "sggList",
        "list"
      ]);

      endpointRows.push({ endpoint: "sgg", rows: sggRows });

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

  return { endpointRows, targets };
}

async function inspectElectionType(sgTypecode, args) {
  const regionFilter = args.region?.trim();
  const limit = Number(args.limit ?? 3);
  const sampleLimit = Number.isFinite(limit) && limit > 0 ? limit : 3;
  const { endpointRows, targets } = await discoverTargets(
    sgTypecode,
    regionFilter
  );
  const samples = [];
  let listTotalCount = 0;
  const listFieldNames = new Set();

  console.log("");
  console.log(`=== sgId=${electionId}, sgTypecode=${sgTypecode} ===`);

  for (const entry of endpointRows) {
    console.log(
      `${entry.endpoint} rows: ${entry.rows.length}, fields: ${fieldNames(
        entry.rows
      ).join(", ")}`
    );
  }

  for (const target of targets) {
    if (samples.length >= sampleLimit) {
      break;
    }

    const pages = await fetchListPages({
      guId: target.guId,
      regionId: target.regionId,
      sgTypecode,
      sggId: target.sggId
    });

    for (const page of pages) {
      listTotalCount += page.count;

      for (const fieldName of fieldNames(page.rows)) {
        listFieldNames.add(fieldName);
      }

      for (const row of page.rows) {
        const candidateApiId = pickString(row, ["huboid"]);
        const materials = candidateApiId
          ? parsePolicyMaterialFileInfo({
              candidateApiId,
              fileinfo: typeof row.fileinfo === "string" ? row.fileinfo : null,
              sgId: pickString(row, ["sgId"]) ?? electionId,
              sgTypecode
            })
          : [];

        if (materials.length === 0) {
          continue;
        }

        const headedMaterials = [];

        for (const material of materials) {
          headedMaterials.push({
            ...material,
            head: material.sourceUrl ? await headPdf(material.sourceUrl) : null
          });
        }

        samples.push({
          candidate: {
            huboid: candidateApiId,
            hbjgiho: pickString(row, ["hbjgiho"]),
            hbjname: pickString(row, ["hbjname"]),
            jdname: pickString(row, ["jdname"]),
            sggname: pickString(row, ["sggname"])
          },
          materials: headedMaterials,
          target: target.label
        });

        if (samples.length >= sampleLimit) {
          break;
        }
      }
    }
  }

  console.log(`targets: ${targets.length}`);
  console.log(`list total count observed: ${listTotalCount}`);
  console.log(`list field names: ${[...listFieldNames].sort().join(", ")}`);
  console.log(`sample materials: ${samples.length}`);

  for (const sample of samples) {
    console.log(JSON.stringify(sample));
  }
}

const args = parseArgs(process.argv.slice(2));

for (const sgTypecode of selectedElectionTypes(args)) {
  await inspectElectionType(sgTypecode, args);
}
