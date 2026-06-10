import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  GitCompareArrows,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserRound,
  UserSearch
} from "lucide-react";

import {
  listElectionCandidateOptionsByFilters,
  listElectionCandidatesByFilters
} from "../../../lib/election-db";
import {
  criminalRecordFilterLabel,
  criminalRecordFilterOptions,
  parseCriminalRecordStatus
} from "../../../lib/candidate-disclosure";
import { officeLabels } from "../../../lib/election-stats";
import {
  candidateElectionBulletinViewerUrl,
  candidateTopFivePledgeViewerUrl
} from "../../../lib/campaign-material-viewer";
import {
  CANDIDATE_LIST_PAGE_SIZE,
  normalizeCandidatePage
} from "../../../lib/candidate-pagination";
import type {
  Candidate,
  CandidateElectionResultStatus,
  OfficeType
} from "../../../types/election";
import { CandidateSearchDependentFilters } from "./CandidateSearchDependentFilters";

export const dynamic = "force-dynamic";

type CandidateSearchProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type CandidateSearchOfficeId =
  | "all"
  | "education"
  | "regional-executive"
  | "local-executive";

type CandidateSearchSortId = "relevance" | "region" | "name";

type CandidateSearchHrefKey =
  | "compare"
  | "criminalRecord"
  | "election"
  | "page"
  | "party"
  | "q"
  | "region"
  | "result"
  | "sort";

type CandidateSearchHrefOverrides = Partial<
  Record<CandidateSearchHrefKey, null | number | string | undefined>
>;

const searchOfficeOptions: Array<{
  id: CandidateSearchOfficeId;
  label: string;
}> = [
  { id: "all", label: "전체" },
  { id: "education", label: "교육감" },
  { id: "regional-executive", label: "시·도지사" },
  { id: "local-executive", label: "시·군·구청장" }
];

const electionResultOptions: Array<{
  id: CandidateElectionResultStatus;
  label: string;
}> = [
  { id: "ELECTED", label: "당선" },
  { id: "NOT_ELECTED", label: "낙선" },
  { id: "UNKNOWN", label: "결과 미확인" }
];

const sortOptions: Array<{
  id: CandidateSearchSortId;
  label: string;
}> = [
  { id: "relevance", label: "관련도순" },
  { id: "region", label: "지역순" },
  { id: "name", label: "이름순" }
];

const pageSize = Math.max(8, CANDIDATE_LIST_PAGE_SIZE);

const officeToneClasses: Record<OfficeType, string> = {
  education_superintendent: "education",
  governor: "governor",
  municipal_mayor: "municipal"
};

const partyToneClasses: Array<{
  className: string;
  names: string[];
}> = [
  { className: "party-democratic", names: ["더불어민주당"] },
  { className: "party-people-power", names: ["국민의힘"] },
  { className: "party-reform", names: ["개혁신당"] },
  { className: "party-progressive", names: ["진보당"] },
  { className: "party-justice", names: ["정의당"] },
  { className: "party-innovation", names: ["조국혁신당"] },
  { className: "party-labor", names: ["노동당"] },
  { className: "party-women", names: ["여성의당"] },
  { className: "party-independent", names: ["무소속", "교육감 후보"] }
];

function singleParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseOffice(value: string | undefined): CandidateSearchOfficeId {
  return searchOfficeOptions.some((option) => option.id === value)
    ? (value as CandidateSearchOfficeId)
    : "all";
}

function officeTypeForSearch(officeId: CandidateSearchOfficeId): OfficeType | undefined {
  switch (officeId) {
    case "education":
      return "education_superintendent";
    case "regional-executive":
      return "governor";
    case "local-executive":
      return "municipal_mayor";
    case "all":
      return undefined;
  }
}

function parseElectionResultStatus(
  value: string | undefined
): CandidateElectionResultStatus | undefined {
  return electionResultOptions.some((option) => option.id === value)
    ? (value as CandidateElectionResultStatus)
    : undefined;
}

function parseSort(value: string | undefined): CandidateSearchSortId {
  return sortOptions.some((option) => option.id === value)
    ? (value as CandidateSearchSortId)
    : "relevance";
}

function parseCompareIds(value: string | undefined) {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  ].slice(0, 4);
}

function buildCandidateSearchHref(
  params: Record<string, string | string[] | undefined>,
  overrides: CandidateSearchHrefOverrides = {}
) {
  const nextParams = new URLSearchParams();

  for (const key of [
    "criminalRecord",
    "election",
    "party",
    "q",
    "region",
    "result",
    "sort",
    "compare"
  ] satisfies Exclude<CandidateSearchHrefKey, "page">[]) {
    const rawValue = Object.prototype.hasOwnProperty.call(overrides, key)
      ? overrides[key]
      : singleParam(params, key);
    const value = typeof rawValue === "string" ? rawValue.trim() : "";

    if (
      value &&
      !(key === "election" && value === "all") &&
      !(key === "sort" && value === "relevance")
    ) {
      nextParams.set(key, value);
    }
  }

  const rawPage = Object.prototype.hasOwnProperty.call(overrides, "page")
    ? overrides.page
    : singleParam(params, "page");
  const page =
    typeof rawPage === "number" ? rawPage : parsePage(String(rawPage ?? ""));

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  const query = nextParams.toString();
  return query ? `/candidates/search?${query}` : "/candidates/search";
}

function compareToggleHref({
  candidateId,
  compareIds,
  params
}: {
  candidateId: string;
  compareIds: string[];
  params: Record<string, string | string[] | undefined>;
}) {
  const nextCompareIds = compareIds.includes(candidateId)
    ? compareIds.filter((id) => id !== candidateId)
    : [...compareIds, candidateId].slice(0, 4);

  return buildCandidateSearchHref(params, {
    compare: nextCompareIds.join(","),
    page: parsePage(singleParam(params, "page"))
  });
}

function candidateLocation(
  candidate: Pick<Candidate, "districtName" | "regionName">
) {
  return candidate.districtName && candidate.districtName !== candidate.regionName
    ? `${candidate.regionName} ${candidate.districtName}`
    : candidate.regionName;
}

function candidateGroupLabel(candidate: Candidate) {
  return candidate.officeType === "education_superintendent"
    ? "교육감 후보"
    : candidate.partyName || "무소속";
}

function officePillClassName(officeType: OfficeType) {
  return `candidate-office-pill ${officeToneClasses[officeType]}`;
}

function partyToneClassName(candidate: Candidate) {
  const groupLabel = candidateGroupLabel(candidate);
  return (
    partyToneClasses.find((partyTone) =>
      partyTone.names.some((partyName) => groupLabel.includes(partyName))
    )?.className ?? "party-other"
  );
}

function partyLabelClassName(candidate: Candidate, baseClassName: string) {
  return `${baseClassName} ${partyToneClassName(candidate)}`;
}

function electionResultLabel(candidate: Candidate) {
  if (!candidate.result) {
    return undefined;
  }

  if (candidate.result.elected === true) {
    return "당선";
  }

  if (candidate.result.elected === false) {
    return "낙선";
  }

  return "결과 미확인";
}

function electionResultClass(candidate: Candidate) {
  if (candidate.result?.elected === true) {
    return "elected";
  }

  if (candidate.result?.elected === false) {
    return "not-elected";
  }

  return "unknown";
}

function electionResultFilterLabel(
  status: CandidateElectionResultStatus | undefined
) {
  return electionResultOptions.find((option) => option.id === status)?.label;
}

function defaultCandidateOrder(left: Candidate, right: Candidate) {
  return (
    left.regionName.localeCompare(right.regionName, "ko") ||
    (left.districtName ?? "").localeCompare(right.districtName ?? "", "ko") ||
    officeLabels[left.officeType].localeCompare(officeLabels[right.officeType], "ko") ||
    Number(left.ballotNumber || 999) - Number(right.ballotNumber || 999) ||
    left.candidateName.localeCompare(right.candidateName, "ko")
  );
}

function relevanceScore(candidate: Candidate, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

  if (!normalizedQuery) {
    return 0;
  }

  const values = [
    candidate.candidateName,
    candidate.regionName,
    candidate.districtName ?? "",
    candidate.partyName
  ].map((value) => value.toLocaleLowerCase("ko-KR"));

  if (values.some((value) => value === normalizedQuery)) {
    return 5;
  }

  if (values.some((value) => value.startsWith(normalizedQuery))) {
    return 4;
  }

  if (values.some((value) => value.includes(normalizedQuery))) {
    return 3;
  }

  return 0;
}

function sortCandidates(
  candidates: Candidate[],
  sortId: CandidateSearchSortId,
  query: string
) {
  return [...candidates].sort((left, right) => {
    switch (sortId) {
      case "name":
        return (
          left.candidateName.localeCompare(right.candidateName, "ko") ||
          defaultCandidateOrder(left, right)
        );
      case "region":
        return defaultCandidateOrder(left, right);
      case "relevance":
      default:
        return (
          relevanceScore(right, query) - relevanceScore(left, query) ||
          defaultCandidateOrder(left, right)
        );
    }
  });
}

function resultSummaryTitle({
  query,
  regionName
}: {
  query: string;
  regionName: string | undefined;
}) {
  if (query) {
    return `"${query}" 검색 결과`;
  }

  if (regionName) {
    return `${regionName} 후보`;
  }

  return "검색 결과";
}

function candidatePledgePreview(candidate: Candidate) {
  return candidate.pledges.slice(0, 3);
}

function CandidateMaterialActions({ candidate }: { candidate: Candidate }) {
  const topFivePledgeUrl =
    candidateTopFivePledgeViewerUrl(candidate) ?? `/candidates/${candidate.id}`;
  const electionBulletinUrl =
    candidateElectionBulletinViewerUrl(candidate) ?? `/candidates/${candidate.id}`;

  return (
    <div className="candidate-material-links" aria-label="후보자 원문 자료">
      <a href={topFivePledgeUrl}>
        5대공약 보기
      </a>
      <a href={electionBulletinUrl}>
        선거공보 보기
      </a>
    </div>
  );
}

export default async function CandidateSearchPage({
  searchParams
}: CandidateSearchProps) {
  const params = await searchParams;
  const officeId = parseOffice(singleParam(params, "election"));
  const officeType = officeTypeForSearch(officeId);
  const query = singleParam(params, "q")?.trim() ?? "";
  const regionName = singleParam(params, "region")?.trim() || undefined;
  const partyName = singleParam(params, "party")?.trim() || undefined;
  const criminalRecordStatus = parseCriminalRecordStatus(
    singleParam(params, "criminalRecord")
  );
  const electionResultStatus = parseElectionResultStatus(
    singleParam(params, "result")
  );
  const sortId = parseSort(singleParam(params, "sort"));
  const compareIds = parseCompareIds(singleParam(params, "compare"));
  const requestedPage = parsePage(singleParam(params, "page"));
  const hasSearchFilters = Boolean(
    query ||
      regionName ||
      partyName ||
      criminalRecordStatus ||
      electionResultStatus
  );

  const officeCandidateOptions = await listElectionCandidateOptionsByFilters({
    officeType
  });
  const filteredCandidates = hasSearchFilters
    ? await listElectionCandidatesByFilters({
        criminalRecordStatus,
        electionResultStatus,
        officeType,
        partyName,
        query,
        regionName
      })
    : [];

  const sortedCandidates = sortCandidates(filteredCandidates, sortId, query);
  const pagination = normalizeCandidatePage({
    page: requestedPage,
    pageSize,
    totalCount: sortedCandidates.length
  });
  const pageCandidates = sortedCandidates.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  );
  const candidateById = new Map(
    sortedCandidates.map((candidate) => [candidate.id, candidate])
  );
  const compareCandidates = compareIds
    .map((id) => candidateById.get(id))
    .filter((candidate): candidate is Candidate => Boolean(candidate));
  const selectedFilters = [
    query ? `검색어: ${query}` : undefined,
    officeId === "all"
      ? undefined
      : searchOfficeOptions.find((option) => option.id === officeId)?.label,
    regionName,
    partyName,
    criminalRecordFilterLabel(criminalRecordStatus),
    electionResultFilterLabel(electionResultStatus)
  ].filter((filter): filter is string => Boolean(filter));

  return (
    <main className="page-shell candidate-search-page">
      <section className="candidate-search-header">
        <div>
          <p className="eyebrow">중앙선거관리위원회 공개데이터 기반</p>
          <h1>후보자 검색</h1>
          <p className="lead">후보자 이름이나 지역으로 후보자를 찾아보세요.</p>
        </div>
        <dl className="candidate-search-data-summary" aria-label="검색 데이터 범위">
          <div>
            <dt>수록 후보</dt>
            <dd>{officeCandidateOptions.length.toLocaleString("ko-KR")}명</dd>
          </div>
          <div>
            <dt>검색 범위</dt>
            <dd>
              {searchOfficeOptions.find((option) => option.id === officeId)?.label}
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel filter-panel candidate-search-panel">
        <div className="search-panel-heading">
          <div>
            <h2>검색 조건</h2>
            <p>검색어 또는 지역을 입력하면 후보 목록이 표시됩니다.</p>
          </div>
        </div>
        <form
          action="/candidates/search"
          className="filter-form candidate-search-form"
          role="search"
        >
          {officeId !== "all" ? (
            <input name="election" type="hidden" value={officeId} />
          ) : null}
          <label className="candidate-search-query">
            <span>후보자 이름 또는 지역</span>
            <span className="candidate-search-input-wrap">
              <Search aria-hidden="true" size={20} strokeWidth={2.2} />
              <input
                autoComplete="off"
                defaultValue={query}
                name="q"
                placeholder="후보자 이름 또는 지역"
                spellCheck={false}
                type="search"
              />
            </span>
          </label>
          <input name="page" type="hidden" value="1" />
          <div className="filter-actions candidate-search-actions">
            <button type="submit">
              <Search aria-hidden="true" size={18} strokeWidth={2.4} />
              후보자 검색
            </button>
            {hasSearchFilters ? (
              <Link
                href={buildCandidateSearchHref(params, {
                  compare: null,
                  page: 1,
                  q: null,
                  party: null,
                  criminalRecord: null,
                  region: null,
                  result: null,
                  sort: null
                })}
              >
                <RotateCcw aria-hidden="true" size={16} strokeWidth={2.2} />
                조건 초기화
              </Link>
            ) : null}
          </div>
          <div className="candidate-search-filter-field candidate-search-office-field">
            <span className="candidate-search-filter-label">선거유형</span>
            <nav
              className="candidate-search-office-tabs"
              aria-label="선거 유형 선택"
            >
              {searchOfficeOptions.map((option) => (
                <Link
                  aria-current={officeId === option.id ? "page" : undefined}
                  className={`candidate-search-office-tab ${
                    officeId === option.id ? "active" : ""
                  }`}
                  href={buildCandidateSearchHref(params, {
                    compare: null,
                    election: option.id === "all" ? null : option.id,
                    page: 1
                  })}
                  key={option.id}
                >
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>
          <details
            className="candidate-search-detail-filters"
            open={Boolean(
              regionName ||
                partyName ||
                criminalRecordStatus ||
                electionResultStatus
            )}
          >
            <summary>
              <span>
                <SlidersHorizontal aria-hidden="true" size={16} strokeWidth={2.2} />
                상세 필터
              </span>
              <ChevronDown
                aria-hidden="true"
                className="candidate-filter-chevron"
                size={16}
                strokeWidth={2.2}
              />
            </summary>
            <CandidateSearchDependentFilters
              candidateOptions={officeCandidateOptions}
              criminalRecordOptions={criminalRecordFilterOptions}
              criminalRecordStatus={criminalRecordStatus}
              electionResultOptions={electionResultOptions}
              electionResultStatus={electionResultStatus}
              key={`${officeId}:${regionName ?? ""}:${partyName ?? ""}`}
              partyName={partyName}
              regionName={regionName}
              sortId={sortId}
              sortOptions={sortOptions}
            />
          </details>
          {selectedFilters.length > 0 ? (
            <div
              aria-label="적용된 검색 조건"
              className="candidate-search-applied-filters"
            >
              <span>적용 조건</span>
              {selectedFilters.map((filter) => (
                <strong key={filter}>{filter}</strong>
              ))}
            </div>
          ) : null}
        </form>
      </section>

      {!hasSearchFilters ? (
        <section className="candidate-search-start" aria-label="검색 전 안내">
          <div className="candidate-search-start-icon" aria-hidden="true">
            <UserSearch size={28} strokeWidth={2.1} />
          </div>
          <div>
            <strong>검색어 또는 지역을 입력해 후보자를 찾으세요.</strong>
            <p>
              선거유형을 먼저 선택하면 해당 범위 안에서만 검색합니다.
            </p>
          </div>
          <div className="candidate-search-examples" aria-label="예시 검색어">
            <span>예시 검색어</span>
            {["서울특별시", "부산광역시", "교육감"].map((example) => (
              <Link
                href={buildCandidateSearchHref(params, {
                  page: 1,
                  q: example
                })}
                key={example}
              >
                {example}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="result-summary" aria-label="검색 결과 요약">
            <strong>{resultSummaryTitle({ query, regionName })}</strong>
            <span>{sortedCandidates.length.toLocaleString("ko-KR")}명</span>
            {selectedFilters.length > 0 ? (
              <em>적용 조건: {selectedFilters.join(" · ")}</em>
            ) : null}
          </section>

          {compareCandidates.length > 0 ? (
            <section
              aria-labelledby="candidate-compare-title"
              className="panel compare-panel"
            >
              <div className="panel-heading">
                <div>
                  <h2 id="candidate-compare-title">
                    선택 후보 비교 {compareCandidates.length} / 4명
                  </h2>
                  <p>
                    후보 기본정보와 주요 공약을 나란히 확인합니다.
                  </p>
                </div>
                <Link
                  className="detail-text-link"
                  href={buildCandidateSearchHref(params, { compare: null })}
                >
                  비교 비우기
                </Link>
              </div>
              {compareCandidates.length === 1 ? (
                <p className="compare-hint">
                  후보 카드에서 한 명을 더 추가하면 차이를 나란히 볼 수 있습니다.
                </p>
              ) : null}
              <div className="compare-table-wrap">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th scope="col">항목</th>
                      {compareCandidates.map((candidate) => (
                        <th key={candidate.id} scope="col">
                          {candidate.candidateName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">지역</th>
                      {compareCandidates.map((candidate) => (
                        <td key={candidate.id}>{candidateLocation(candidate)}</td>
                      ))}
                    </tr>
                    {officeId === "all" ? (
                      <tr>
                        <th scope="row">선거유형</th>
                        {compareCandidates.map((candidate) => (
                          <td key={candidate.id}>
                            <span className={officePillClassName(candidate.officeType)}>
                              {officeLabels[candidate.officeType]}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ) : null}
                    <tr>
                      <th scope="row">후보 구분</th>
                      {compareCandidates.map((candidate) => (
                        <td key={candidate.id}>
                          <span
                            className={partyLabelClassName(
                              candidate,
                              "candidate-party-inline"
                            )}
                          >
                            {candidateGroupLabel(candidate)}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">당선 결과</th>
                      {compareCandidates.map((candidate) => (
                        <td key={candidate.id}>
                          {electionResultLabel(candidate) ?? "결과 미확인"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">주요 공약</th>
                      {compareCandidates.map((candidate) => (
                        <td key={candidate.id}>
                          <ol className="compare-pledge-list">
                            {candidatePledgePreview(candidate).map((pledge) => (
                              <li key={pledge.id}>{pledge.title}</li>
                            ))}
                          </ol>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">원문</th>
                      {compareCandidates.map((candidate) => (
                        <td key={candidate.id}>
                          <Link href={`/candidates/${candidate.id}`}>상세</Link>
                          {" / "}
                          <a
                            href={
                              candidateTopFivePledgeViewerUrl(candidate) ??
                              `/candidates/${candidate.id}`
                            }
                          >
                            5대공약
                          </a>
                          {" / "}
                          <a
                            href={
                              candidateElectionBulletinViewerUrl(candidate) ??
                              `/candidates/${candidate.id}`
                            }
                          >
                            선거공보
                          </a>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="panel candidate-section">
            <div className="panel-heading candidate-heading">
              <div>
                <h2 id="candidate-list-title">검색 결과</h2>
                <p>후보자 이름을 선택하면 상세 정보와 주요 공약을 확인할 수 있습니다.</p>
              </div>
              <span>
                {sortedCandidates.length.toLocaleString("ko-KR")}명 중{" "}
                {pageCandidates.length.toLocaleString("ko-KR")}명 표시
              </span>
            </div>

            {pageCandidates.length > 0 ? (
              <div className="candidate-list">
                {pageCandidates.map((candidate) => {
                  const isCompared = compareIds.includes(candidate.id);
                  const compareIsFull = compareIds.length >= 4 && !isCompared;
                  const resultLabel = electionResultLabel(candidate);
                  const pledges = candidatePledgePreview(candidate);

                  return (
                    <article
                      className={`candidate-card ${isCompared ? "selected" : ""}`}
                      key={candidate.id}
                    >
                      <div className="candidate-identity">
                        <div className="candidate-avatar-block">
                          <span className={officePillClassName(candidate.officeType)}>
                            {officeLabels[candidate.officeType]}
                          </span>
                          <span className="candidate-avatar" aria-hidden="true">
                            <UserRound size={44} strokeWidth={1.6} />
                          </span>
                        </div>
                        <div className="candidate-profile">
                          <span className="candidate-location">
                            <MapPin aria-hidden="true" size={16} strokeWidth={2.1} />
                            {candidateLocation(candidate)}
                          </span>
                          <Link
                            className="candidate-name"
                            href={`/candidates/${candidate.id}`}
                          >
                            {candidate.candidateName}
                          </Link>
                          <span
                            className={partyLabelClassName(
                              candidate,
                              "candidate-party"
                            )}
                          >
                            {candidateGroupLabel(candidate)}
                          </span>
                          {resultLabel ? (
                            <span
                              className={`election-result-chip ${electionResultClass(candidate)}`}
                            >
                              {resultLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <dl className="candidate-fact-grid">
                        <div>
                          <dt>당선 결과</dt>
                          <dd
                            className={
                              resultLabel
                                ? `candidate-fact-result ${electionResultClass(candidate)}`
                                : ""
                            }
                          >
                            {resultLabel ?? "결과 미확인"}
                          </dd>
                        </div>
                        <div>
                          <dt>후보 구분</dt>
                          <dd>
                            <span
                              className={partyLabelClassName(
                                candidate,
                                "candidate-party-inline"
                              )}
                            >
                              {candidateGroupLabel(candidate)}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt>선거구</dt>
                          <dd>{candidateLocation(candidate)}</dd>
                        </div>
                        <div>
                          <dt>주요 공약</dt>
                          <dd className="candidate-fact-pledge">
                            {pledges[0]?.title ?? "후보 상세에서 확인"}
                          </dd>
                        </div>
                      </dl>
                      <div className="candidate-actions">
                        <Link
                          className="action-button primary candidate-detail-button"
                          href={`/candidates/${candidate.id}`}
                        >
                          상세 보기
                          <ChevronRight aria-hidden="true" size={18} strokeWidth={2.4} />
                        </Link>
                        {compareIsFull ? (
                          <span
                            aria-disabled="true"
                            className="action-button disabled"
                          >
                            최대 4명
                          </span>
                        ) : (
                          <Link
                            className="action-button secondary"
                            href={compareToggleHref({
                              candidateId: candidate.id,
                              compareIds,
                              params
                            })}
                          >
                            <GitCompareArrows
                              aria-hidden="true"
                              size={16}
                              strokeWidth={2.2}
                            />
                            {isCompared ? "비교 해제" : "비교에 추가"}
                          </Link>
                        )}
                        <CandidateMaterialActions candidate={candidate} />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-result">
                <strong>조건에 맞는 후보자가 없습니다.</strong>
                <p>검색어를 줄이거나 지역 조건을 완화해보세요.</p>
                <div className="empty-actions">
                  <Link
                    className="action-button primary"
                    href={buildCandidateSearchHref(params, {
                      compare: null,
                      criminalRecord: null,
                      page: 1,
                      party: null,
                      q: null,
                      region: null,
                      result: null,
                      sort: null
                    })}
                  >
                    조건 초기화
                  </Link>
                </div>
              </div>
            )}

            {pagination.totalPages > 1 ? (
              <nav className="pagination" aria-label="후보자 검색 결과 페이지">
                {pagination.page <= 1 ? (
                  <span aria-disabled="true" className="pagination-disabled">
                    이전
                  </span>
                ) : (
                  <Link
                    href={buildCandidateSearchHref(params, {
                      page: pagination.page - 1
                    })}
                  >
                    이전
                  </Link>
                )}
                <span>
                  {pagination.page.toLocaleString("ko-KR")} /{" "}
                  {pagination.totalPages.toLocaleString("ko-KR")}
                </span>
                {pagination.page >= pagination.totalPages ? (
                  <span aria-disabled="true" className="pagination-disabled">
                    다음
                  </span>
                ) : (
                  <Link
                    href={buildCandidateSearchHref(params, {
                      page: pagination.page + 1
                    })}
                  >
                    다음
                  </Link>
                )}
              </nav>
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}
