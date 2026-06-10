import { NextResponse } from "next/server";

import { listElectionCandidatesByFilters } from "../../../lib/election-db";
import {
  buildExecutiveAnalysisPath,
  parseExecutiveAnalysisRequest
} from "../../../lib/executive-analysis-api";
import { candidateMatchesElectionTab } from "../../../lib/election-tabs";
import {
  analyzeMayorPledges,
  prepareMayorPledgeClientAnalysis,
  type MayorPledgeClientAnalysis
} from "../../../lib/mayor-pledge-analysis";
import {
  canUsePrecomputedExecutiveAnalysis,
  readPrecomputedExecutiveAnalysis
} from "../../../lib/precomputed-executive-analysis";

const EXECUTIVE_ANALYSIS_CACHE_TTL_MS = 10 * 60 * 1000;

type ExecutiveAnalysisPayload = {
  analysis: MayorPledgeClientAnalysis;
  generatedAt: string;
};

const globalForExecutiveAnalysis = globalThis as unknown as {
  executiveAnalysisCache?: Map<
    string,
    {
      expiresAt: number;
      payload: ExecutiveAnalysisPayload;
    }
  >;
};

const executiveAnalysisCache =
  globalForExecutiveAnalysis.executiveAnalysisCache ?? new Map();

globalForExecutiveAnalysis.executiveAnalysisCache = executiveAnalysisCache;

function cachedPayload(cacheKey: string) {
  const cached = executiveAnalysisCache.get(cacheKey);

  if (!cached || cached.expiresAt <= Date.now()) {
    executiveAnalysisCache.delete(cacheKey);
    return undefined;
  }

  return cached.payload;
}

function setCachedPayload(cacheKey: string, payload: ExecutiveAnalysisPayload) {
  executiveAnalysisCache.set(cacheKey, {
    expiresAt: Date.now() + EXECUTIVE_ANALYSIS_CACHE_TTL_MS,
    payload
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const analysisRequest = parseExecutiveAnalysisRequest(url.searchParams);

  if (!analysisRequest) {
    return NextResponse.json(
      { error: "Unsupported executive analysis request." },
      { status: 400 }
    );
  }

  const cacheKey = buildExecutiveAnalysisPath({
    electionValue: analysisRequest.tab,
    filters: analysisRequest.filters
  });

  if (canUsePrecomputedExecutiveAnalysis(analysisRequest.filters)) {
    const precomputed = await readPrecomputedExecutiveAnalysis(analysisRequest.tab);

    if (precomputed) {
      return NextResponse.json({
        analysis: precomputed.analysis,
        cache: "precomputed",
        generatedAt: precomputed.generatedAt
      });
    }
  }

  const cached = cachedPayload(cacheKey);

  if (cached) {
    return NextResponse.json({
      ...cached,
      cache: "hit"
    });
  }

  const candidates = await listElectionCandidatesByFilters(
    analysisRequest.candidateFilters
  );
  const analysis = analyzeMayorPledges(
    candidates,
    analysisRequest.filters,
    (candidate) => candidateMatchesElectionTab(candidate, analysisRequest.tab)
  );
  const payload = {
    analysis: prepareMayorPledgeClientAnalysis(analysis),
    generatedAt: new Date().toISOString()
  };

  setCachedPayload(cacheKey, payload);

  return NextResponse.json({
    ...payload,
    cache: "miss"
  });
}
