"use client";

import { useMemo, useState } from "react";

type CandidateFilterOption = {
  id: string;
  partyName: string;
  regionName: string;
};

type SelectOption = {
  id: string;
  label: string;
};

type CandidateSearchDependentFiltersProps = {
  candidateOptions: CandidateFilterOption[];
  criminalRecordOptions: SelectOption[];
  criminalRecordStatus?: string;
  electionResultOptions: SelectOption[];
  electionResultStatus?: string;
  partyName?: string;
  regionName?: string;
  sortId: string;
  sortOptions: SelectOption[];
};

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "ko")
  );
}

function hasMatchingCandidate({
  candidateOptions,
  partyName,
  regionName
}: {
  candidateOptions: CandidateFilterOption[];
  partyName: string;
  regionName: string;
}) {
  return candidateOptions.some(
    (candidate) =>
      candidate.partyName === partyName && candidate.regionName === regionName
  );
}

export function CandidateSearchDependentFilters({
  candidateOptions,
  criminalRecordOptions,
  criminalRecordStatus,
  electionResultOptions,
  electionResultStatus,
  partyName,
  regionName,
  sortId,
  sortOptions
}: CandidateSearchDependentFiltersProps) {
  const initialPairIsValid =
    !partyName ||
    !regionName ||
    hasMatchingCandidate({ candidateOptions, partyName, regionName });
  const [regionValue, setRegionValue] = useState(regionName ?? "");
  const [partyValue, setPartyValue] = useState(
    initialPairIsValid ? (partyName ?? "") : ""
  );

  const regions = useMemo(
    () =>
      uniqueSorted(
        candidateOptions
          .filter((candidate) => !partyValue || candidate.partyName === partyValue)
          .map((candidate) => candidate.regionName)
      ),
    [candidateOptions, partyValue]
  );
  const parties = useMemo(
    () =>
      uniqueSorted(
        candidateOptions
          .filter((candidate) => !regionValue || candidate.regionName === regionValue)
          .map((candidate) => candidate.partyName)
      ),
    [candidateOptions, regionValue]
  );

  return (
    <div>
      <label>
        <span>지역</span>
        <select
          name="region"
          onChange={(event) => {
            const nextRegion = event.target.value;
            setRegionValue(nextRegion);

            if (
              partyValue &&
              nextRegion &&
              !hasMatchingCandidate({
                candidateOptions,
                partyName: partyValue,
                regionName: nextRegion
              })
            ) {
              setPartyValue("");
            }
          }}
          value={regionValue}
        >
          <option value="">전체</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>정당</span>
        <select
          name="party"
          onChange={(event) => {
            const nextParty = event.target.value;
            setPartyValue(nextParty);

            if (
              regionValue &&
              nextParty &&
              !hasMatchingCandidate({
                candidateOptions,
                partyName: nextParty,
                regionName: regionValue
              })
            ) {
              setRegionValue("");
            }
          }}
          value={partyValue}
        >
          <option value="">전체</option>
          {parties.map((party) => (
            <option key={party} value={party}>
              {party}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>전과 유무</span>
        <select defaultValue={criminalRecordStatus ?? ""} name="criminalRecord">
          <option value="">전체</option>
          {criminalRecordOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>당선 결과</span>
        <select defaultValue={electionResultStatus ?? ""} name="result">
          <option value="">전체</option>
          {electionResultOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>정렬</span>
        <select defaultValue={sortId} name="sort">
          {sortOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
