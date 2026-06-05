import type { CandidateListFilters } from "./election-db";
import {
  isExecutiveElectionTab,
  officeTypeForElectionTab,
  parseElectionTab,
  type ExecutiveElectionTabId
} from "./election-tabs";
import type { MayorPledgeFilter } from "./mayor-pledge-analysis";

export type ExecutiveAnalysisRequest = {
  candidateFilters: CandidateListFilters;
  filters: MayorPledgeFilter;
  tab: ExecutiveElectionTabId;
};

function optionalParam(searchParams: URLSearchParams, key: string) {
  return searchParams.get(key)?.trim() || undefined;
}

export function parseExecutiveAnalysisRequest(
  searchParams: URLSearchParams
): ExecutiveAnalysisRequest | undefined {
  const tab = parseElectionTab(optionalParam(searchParams, "election"));

  if (!isExecutiveElectionTab(tab)) {
    return undefined;
  }

  const filters: MayorPledgeFilter = {
    candidateId: optionalParam(searchParams, "candidate"),
    partyName: optionalParam(searchParams, "party"),
    query: optionalParam(searchParams, "q"),
    regionName: optionalParam(searchParams, "region")
  };

  return {
    candidateFilters: {
      officeType: officeTypeForElectionTab(tab),
      partyName: filters.partyName,
      regionName: filters.regionName
    },
    filters,
    tab
  };
}

export function buildExecutiveAnalysisPath({
  electionValue,
  filters
}: {
  electionValue: string;
  filters: MayorPledgeFilter;
}) {
  const params = new URLSearchParams();
  params.set("election", electionValue);

  if (filters.candidateId) {
    params.set("candidate", filters.candidateId);
  }

  if (filters.partyName) {
    params.set("party", filters.partyName);
  }

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (filters.regionName) {
    params.set("region", filters.regionName);
  }

  return `/api/executive-analysis?${params.toString()}`;
}
