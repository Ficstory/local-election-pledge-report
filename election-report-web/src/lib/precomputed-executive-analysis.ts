import { readFile } from "node:fs/promises";
import path from "node:path";

import { EXECUTIVE_PLEDGE_ANALYSIS_OUTPUT_DIR } from "./executive-pledge-analysis.ts";
import type { ExecutiveElectionTabId } from "./election-tabs";
import {
  sanitizeMayorPledgeClientAnalysis,
  type MayorPledgeClientAnalysis,
  type MayorPledgeFilter
} from "./mayor-pledge-analysis";

export type PrecomputedExecutiveAnalysisPayload = {
  analysis: MayorPledgeClientAnalysis;
  election: ExecutiveElectionTabId;
  generatedAt: string;
};

const PRECOMPUTED_CLIENT_ANALYSIS_DIR = "client-analysis";

const globalForPrecomputedExecutiveAnalysis = globalThis as unknown as {
  precomputedExecutiveAnalysisCache?: Map<
    ExecutiveElectionTabId,
    PrecomputedExecutiveAnalysisPayload
  >;
};

const precomputedExecutiveAnalysisCache =
  globalForPrecomputedExecutiveAnalysis.precomputedExecutiveAnalysisCache ??
  new Map<ExecutiveElectionTabId, PrecomputedExecutiveAnalysisPayload>();

globalForPrecomputedExecutiveAnalysis.precomputedExecutiveAnalysisCache =
  precomputedExecutiveAnalysisCache;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isExecutiveElectionTabId(
  value: unknown
): value is ExecutiveElectionTabId {
  return value === "regional-executive" || value === "local-executive";
}

function isPrecomputedPayload(
  value: unknown
): value is PrecomputedExecutiveAnalysisPayload {
  return (
    isRecord(value) &&
    isExecutiveElectionTabId(value.election) &&
    typeof value.generatedAt === "string" &&
    isRecord(value.analysis) &&
    Array.isArray(value.analysis.candidateKeywords) &&
    Array.isArray(value.analysis.keywords) &&
    Array.isArray(value.analysis.pledgeItems) &&
    Array.isArray(value.analysis.policyCategories)
  );
}

export function canUsePrecomputedExecutiveAnalysis(filters: MayorPledgeFilter) {
  return !(
    filters.candidateId ||
    filters.districtName ||
    filters.partyName ||
    filters.query ||
    filters.regionName
  );
}

export function precomputedExecutiveAnalysisPath(tab: ExecutiveElectionTabId) {
  return path.join(
    process.cwd(),
    EXECUTIVE_PLEDGE_ANALYSIS_OUTPUT_DIR,
    PRECOMPUTED_CLIENT_ANALYSIS_DIR,
    `${tab}.json`
  );
}

export async function readPrecomputedExecutiveAnalysis(
  tab: ExecutiveElectionTabId
) {
  const cached = precomputedExecutiveAnalysisCache.get(tab);

  if (cached) {
    return cached;
  }

  try {
    const raw = await readFile(precomputedExecutiveAnalysisPath(tab), "utf8");
    const payload = JSON.parse(raw) as unknown;

    if (!isPrecomputedPayload(payload) || payload.election !== tab) {
      return undefined;
    }

    const sanitizedPayload = {
      ...payload,
      analysis: sanitizeMayorPledgeClientAnalysis(payload.analysis)
    };

    precomputedExecutiveAnalysisCache.set(tab, sanitizedPayload);
    return sanitizedPayload;
  } catch (error: unknown) {
    if (
      isRecord(error) &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")
    ) {
      return undefined;
    }

    throw error;
  }
}
