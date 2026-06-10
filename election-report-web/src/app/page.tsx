import Link from "next/link";

import { MayorPledgeAnalysis } from "./MayorPledgeAnalysis";
import {
  type CandidateListFilters,
  type ElectionCandidateOption,
  listElectionCandidateOptionsByFilters,
  listElectionCandidatesByFilters
} from "../lib/election-db";
import { getElectionSummary, officeLabels } from "../lib/election-stats";
import {
  classifyEducationCandidate,
  educationOrientationOptions,
  filterEducationCandidatesByOrientation,
  type EducationOrientationId,
  type EducationOrientationProfile
} from "../lib/education-orientation";
import {
  analyzeMayorPledges,
  prepareMayorPledgeClientAnalysis,
  type MayorPledgeFilter
} from "../lib/mayor-pledge-analysis";
import {
  candidateMatchesElectionTab,
  electionTabs,
  executiveAnalysisCopyByTab,
  isExecutiveElectionTab,
  officeTypeForElectionTab,
  parseElectionTab,
  type ElectionTabId
} from "../lib/election-tabs";
import {
  CANDIDATE_LIST_PAGE_SIZE,
  normalizeCandidatePage
} from "../lib/candidate-pagination";
import {
  candidateElectionBulletinViewerUrl,
  candidateTopFivePledgeViewerUrl
} from "../lib/campaign-material-viewer";
import {
  criminalRecordClass,
  criminalRecordDetail,
  criminalRecordFilterLabel,
  criminalRecordFilterOptions,
  criminalRecordLabel,
  parseCriminalRecordStatus
} from "../lib/candidate-disclosure";
import type { Candidate, CandidateElectionResultStatus } from "../types/election";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type EducationSortId =
  | "region"
  | "name"
  | "pledge-count"
  | "material-status"
  | "updated-at";

type EducationHrefKey =
  | "compare"
  | "criminalRecord"
  | "electionResult"
  | "orientation"
  | "policyAxis"
  | "q"
  | "region"
  | "sort";

type EducationHrefOverrides = Partial<
  Record<EducationHrefKey, null | string | undefined>
> & {
  page?: null | number;
};

const educationSortOptions: Array<{
  id: EducationSortId;
  label: string;
}> = [
  { id: "region", label: "지역순" },
  { id: "name", label: "이름순" },
  { id: "pledge-count", label: "공약 수 많은순" },
  { id: "material-status", label: "원문 자료 우선" },
  { id: "updated-at", label: "최근 확인순" }
];

const electionResultFilterOptions: Array<{
  id: CandidateElectionResultStatus;
  label: string;
}> = [
  { id: "ELECTED", label: "당선" },
  { id: "NOT_ELECTED", label: "낙선" },
  { id: "UNKNOWN", label: "결과 확인중" }
];

const officialEducationRegions = new Set([
  "강원특별자치도",
  "경기도",
  "경상남도",
  "경상북도",
  "광주광역시",
  "대구광역시",
  "대전광역시",
  "부산광역시",
  "서울특별시",
  "세종특별자치시",
  "울산광역시",
  "인천광역시",
  "전라남도",
  "전남광주통합특별시",
  "전북특별자치도",
  "제주특별자치도",
  "충청남도",
  "충청북도"
]);

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

function parseEducationOrientation(
  value: string | undefined
): EducationOrientationId | undefined {
  const orientation = value?.trim();

  return educationOrientationOptions.some((option) => option.id === orientation)
    ? (orientation as EducationOrientationId)
    : undefined;
}

function parseEducationSort(value: string | undefined): EducationSortId {
  const sortId = value?.trim();

  return educationSortOptions.some((option) => option.id === sortId)
    ? (sortId as EducationSortId)
    : "region";
}

function parseElectionResultStatus(
  value: string | undefined
): CandidateElectionResultStatus | undefined {
  const status = value?.trim();

  return electionResultFilterOptions.some((option) => option.id === status)
    ? (status as CandidateElectionResultStatus)
    : undefined;
}

function parsePolicyAxis(value: string | undefined) {
  const policyAxis = value?.trim();
  return policyAxis && /^[a-z-]+$/.test(policyAxis) ? policyAxis : undefined;
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

function hasOverride(
  overrides: EducationHrefOverrides,
  key: EducationHrefKey | "page"
) {
  return Object.prototype.hasOwnProperty.call(overrides, key);
}

function buildEducationHref(
  params: Record<string, string | string[] | undefined>,
  overrides: EducationHrefOverrides = {}
) {
  const nextParams = new URLSearchParams();
  nextParams.set("election", "education");

  for (const key of [
    "q",
    "region",
    "criminalRecord",
    "electionResult",
    "orientation",
    "policyAxis",
    "sort",
    "compare"
  ] satisfies EducationHrefKey[]) {
    const rawValue = hasOverride(overrides, key)
      ? overrides[key]
      : singleParam(params, key);
    const value = typeof rawValue === "string" ? rawValue.trim() : "";

    if (value && !(key === "sort" && value === "region")) {
      nextParams.set(key, value);
    }
  }

  const pageValue = hasOverride(overrides, "page")
    ? overrides.page
    : parsePage(singleParam(params, "page"));
  const page = typeof pageValue === "number" ? pageValue : 1;

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  return `/?${nextParams.toString()}`;
}

function buildTabHref(tabId: ElectionTabId) {
  return `/?election=${tabId}`;
}

function candidateMaterialUrl(candidate: Candidate) {
  return candidateTopFivePledgeViewerUrl(candidate);
}

function candidateElectionBulletinUrl(candidate: Candidate) {
  return candidateElectionBulletinViewerUrl(candidate);
}

function candidateLocation(
  candidate: Pick<Candidate, "districtName" | "regionName">
) {
  return candidate.districtName && candidate.districtName !== candidate.regionName
    ? `${candidate.regionName} ${candidate.districtName}`
    : candidate.regionName;
}

function hasVisibleBallotNumber(ballotNumber: string) {
  return ballotNumber.trim() !== "" && ballotNumber !== "없음";
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

  return "결과 확인중";
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
  return electionResultFilterOptions.find((option) => option.id === status)?.label;
}

function formatVoteRate(voteRate: number) {
  return `${voteRate.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })}%`;
}

function resultSummaryTitle(filters: CandidateListFilters) {
  return filters.query
    ? `"${filters.query}" 검색 결과`
    : "선택한 조건의 검색 결과";
}

function uniqueSorted(values: Array<string | undefined>) {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value)))
  ].sort((left, right) => left.localeCompare(right, "ko"));
}

function buildMayorOptions(
  mayorCandidates: ElectionCandidateOption[],
  filters: MayorPledgeFilter
) {
  const regionCandidates = mayorCandidates.filter(
    (candidate) => !filters.regionName || candidate.regionName === filters.regionName
  );
  const partyCandidates = regionCandidates.filter(
    (candidate) => !filters.partyName || candidate.partyName === filters.partyName
  );

  return {
    regions: uniqueSorted(mayorCandidates.map((candidate) => candidate.regionName)),
    parties: uniqueSorted(regionCandidates.map((candidate) => candidate.partyName)),
    candidates: partyCandidates
      .map((candidate) => ({
        id: candidate.id,
        label: `${candidate.candidateName} (${candidateLocation(candidate)})`,
        partyName: candidate.partyName,
        regionName: candidateLocation(candidate)
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "ko"))
  };
}

function educationProfileEvidence(profile: EducationOrientationProfile) {
  const evidence =
    profile.orientation.id === "progressive"
      ? profile.evidence.progressive
      : profile.evidence.conservative;

  return evidence
    .slice(0, 3)
    .map((item) => item.keyword)
    .join(", ");
}

function educationProfilePolicyAxes(profile: EducationOrientationProfile) {
  return profile.policyAxes
    .slice(0, 2)
    .map((axis) => axis.label)
    .join(", ");
}

function materialStatusRank(candidate: Candidate) {
  if (candidate.material.status === "analyzed") {
    return 3;
  }

  if (candidate.material.status === "collected") {
    return 2;
  }

  return candidateMaterialUrl(candidate) ? 1 : 0;
}

function updatedAtTimestamp(candidate: Candidate) {
  return candidate.source.fetchedAt
    ? new Date(candidate.source.fetchedAt).getTime()
    : 0;
}

function compareByDefaultOrder(left: Candidate, right: Candidate) {
  return (
    left.regionName.localeCompare(right.regionName, "ko") ||
    (left.districtName ?? "").localeCompare(right.districtName ?? "", "ko") ||
    Number(left.ballotNumber || 999) - Number(right.ballotNumber || 999) ||
    left.candidateName.localeCompare(right.candidateName, "ko")
  );
}

function sortEducationCandidates(
  candidates: Candidate[],
  sortId: EducationSortId
) {
  return [...candidates].sort((left, right) => {
    switch (sortId) {
      case "name":
        return (
          left.candidateName.localeCompare(right.candidateName, "ko") ||
          compareByDefaultOrder(left, right)
        );
      case "pledge-count":
        return (
          right.pledges.length - left.pledges.length ||
          compareByDefaultOrder(left, right)
        );
      case "material-status":
        return (
          materialStatusRank(right) - materialStatusRank(left) ||
          compareByDefaultOrder(left, right)
        );
      case "updated-at":
        return (
          updatedAtTimestamp(right) - updatedAtTimestamp(left) ||
          compareByDefaultOrder(left, right)
        );
      case "region":
      default:
        return compareByDefaultOrder(left, right);
    }
  });
}

function buildPolicyAxisOptions(
  candidates: Candidate[],
  profiles: Map<string, EducationOrientationProfile>
) {
  const axisCounts = new Map<string, { count: number; label: string }>();

  for (const candidate of candidates) {
    const profile = profiles.get(candidate.id) ?? classifyEducationCandidate(candidate);

    for (const axis of profile.policyAxes) {
      const current = axisCounts.get(axis.id);
      axisCounts.set(axis.id, {
        count: (current?.count ?? 0) + 1,
        label: axis.label
      });
    }
  }

  return [...axisCounts.entries()]
    .map(([id, axis]) => ({ id, ...axis }))
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label, "ko")
    );
}

function summarizeUnrecognizedRegions(candidates: Candidate[]) {
  const regionCounts = new Map<string, number>();

  for (const candidate of candidates) {
    if (!officialEducationRegions.has(candidate.regionName)) {
      regionCounts.set(
        candidate.regionName,
        (regionCounts.get(candidate.regionName) ?? 0) + 1
      );
    }
  }

  return [...regionCounts.entries()]
    .map(([regionName, count]) => ({ count, regionName }))
    .sort((left, right) => left.regionName.localeCompare(right.regionName, "ko"));
}

function regionOptionLabel(region: string) {
  return officialEducationRegions.has(region) ? region : `${region} (확인 필요)`;
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

  return buildEducationHref(params, {
    compare: nextCompareIds.join(","),
    page: parsePage(singleParam(params, "page"))
  });
}

function ElectionTypeTabs({ activeTab }: { activeTab: ElectionTabId }) {
  return (
    <nav className="election-tabs" aria-label="선거 유형 선택">
      {electionTabs.map((tab) => (
        <Link
          aria-current={activeTab === tab.id ? "page" : undefined}
          className={`election-tab ${activeTab === tab.id ? "active" : ""}`}
          href={buildTabHref(tab.id)}
          key={tab.id}
        >
          <span>{tab.label}</span>
          <small>{tab.description}</small>
        </Link>
      ))}
    </nav>
  );
}

function shouldRenderLanding(
  params: Record<string, string | string[] | undefined>
) {
  const dashboardKeys = [
    "candidate",
    "compare",
    "criminalRecord",
    "election",
    "office",
    "orientation",
    "page",
    "party",
    "policyAxis",
    "q",
    "region",
    "sort"
  ];

  return !dashboardKeys.some((key) => Boolean(singleParam(params, key)?.trim()));
}

function ProjectLanding() {
  return (
    <main className="page-shell landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="eyebrow">중앙선거관리위원회 공개데이터 기반</p>
          <h1 id="landing-title">선거 공약과 결과를 함께 읽는 페이지</h1>
          <p className="lead">
            후보자의 공약, 선거공보, 당선 결과를 연결해 어떤 정책 흐름이
            선택으로 이어졌는지 확인할 수 있습니다.
          </p>
          <div className="landing-actions">
            <Link className="action-button primary" href="/?election=regional-executive">
              공약 선택 분석 보기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  if (shouldRenderLanding(params)) {
    return <ProjectLanding />;
  }

  const activeTab = parseElectionTab(singleParam(params, "election"));

  if (isExecutiveElectionTab(activeTab)) {
    const officeType = officeTypeForElectionTab(activeTab);
    const executiveFilters: MayorPledgeFilter = {
      candidateId: singleParam(params, "candidate")?.trim() || undefined,
      partyName: singleParam(params, "party")?.trim() || undefined,
      query: singleParam(params, "q")?.trim() || undefined,
      regionName: singleParam(params, "region")?.trim() || undefined
    };
    const [executiveCandidates, executiveAnalysisCandidates] = await Promise.all([
      listElectionCandidateOptionsByFilters({
        officeType
      }),
      listElectionCandidatesByFilters({
        officeType,
        partyName: executiveFilters.partyName,
        regionName: executiveFilters.regionName
      })
    ]);
    const analysis = analyzeMayorPledges(
      executiveAnalysisCandidates,
      executiveFilters,
      (candidate) => candidateMatchesElectionTab(candidate, activeTab)
    );

    return (
      <main className="page-shell mayor-page">
        <ElectionTypeTabs activeTab={activeTab} />
        <MayorPledgeAnalysis
          analysis={prepareMayorPledgeClientAnalysis(analysis)}
          copy={executiveAnalysisCopyByTab[activeTab]}
          electionValue={activeTab}
          filters={executiveFilters}
          options={buildMayorOptions(executiveCandidates, executiveFilters)}
        />
      </main>
    );
  }

  const orientationId = parseEducationOrientation(singleParam(params, "orientation"));
  const sortId = parseEducationSort(singleParam(params, "sort"));
  const policyAxisId = parsePolicyAxis(singleParam(params, "policyAxis"));
  const criminalRecordStatus = parseCriminalRecordStatus(
    singleParam(params, "criminalRecord")
  );
  const electionResultStatus = parseElectionResultStatus(
    singleParam(params, "electionResult")
  );
  const compareIds = parseCompareIds(singleParam(params, "compare"));
  const filters: CandidateListFilters = {
    criminalRecordStatus,
    electionResultStatus,
    officeType: "education_superintendent",
    query: singleParam(params, "q")?.trim() || undefined,
    regionName: singleParam(params, "region")?.trim() || undefined
  };
  const page = parsePage(singleParam(params, "page"));
  const [baseEducationCandidates, allEducationCandidates] = await Promise.all([
    listElectionCandidatesByFilters(filters),
    listElectionCandidatesByFilters({ officeType: "education_superintendent" })
  ]);
  const allCandidateById = new Map(
    allEducationCandidates.map((candidate) => [candidate.id, candidate])
  );
  const baseProfiles = new Map(
    baseEducationCandidates.map((candidate) => [
      candidate.id,
      classifyEducationCandidate(candidate)
    ])
  );
  const orientationFilteredCandidates = filterEducationCandidatesByOrientation(
    baseEducationCandidates,
    orientationId
  );
  const policyAxisOptions = buildPolicyAxisOptions(
    orientationFilteredCandidates,
    baseProfiles
  );
  const selectedPolicyAxis = policyAxisOptions.find(
    (axis) => axis.id === policyAxisId
  );
  const axisFilteredCandidates = policyAxisId
    ? orientationFilteredCandidates.filter((candidate) => {
        const profile =
          baseProfiles.get(candidate.id) ?? classifyEducationCandidate(candidate);
        return profile.policyAxes.some((axis) => axis.id === policyAxisId);
      })
    : orientationFilteredCandidates;
  const sortedCandidates = sortEducationCandidates(axisFilteredCandidates, sortId);
  const pagination = normalizeCandidatePage({
    page,
    pageSize: CANDIDATE_LIST_PAGE_SIZE,
    totalCount: sortedCandidates.length
  });
  const candidates = sortedCandidates.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  );
  const candidateProfiles = new Map(
    sortedCandidates.map((candidate) => [
      candidate.id,
      baseProfiles.get(candidate.id) ?? classifyEducationCandidate(candidate)
    ])
  );
  const compareCandidates = compareIds
    .map((id) => allCandidateById.get(id))
    .filter((candidate): candidate is Candidate => Boolean(candidate));
  const compareProfiles = new Map(
    compareCandidates.map((candidate) => [
      candidate.id,
      classifyEducationCandidate(candidate)
    ])
  );
  const summary = getElectionSummary(sortedCandidates);
  const invalidRegions = summarizeUnrecognizedRegions(allEducationCandidates);
  const hasActiveFilters = Boolean(
    filters.query ||
      filters.regionName ||
      orientationId ||
      policyAxisId ||
      criminalRecordStatus ||
      electionResultStatus
  );
  const compareQuery = compareIds.join(",");
  const educationOptions = {
    regions: uniqueSorted(
      allEducationCandidates.map((candidate) => candidate.regionName)
    )
  };
  const selectedOrientation = orientationId
    ? educationOrientationOptions.find((option) => option.id === orientationId)
    : undefined;
  const selectedFilters = [
    officeLabels.education_superintendent,
    filters.regionName,
    criminalRecordFilterLabel(criminalRecordStatus),
    electionResultFilterLabel(electionResultStatus),
    selectedOrientation?.label,
    selectedPolicyAxis?.label
  ].filter((filter): filter is string => Boolean(filter));
  const relaxedHref = buildEducationHref(params, {
    criminalRecord: null,
    electionResult: null,
    orientation: null,
    page: 1,
    policyAxis: null,
    q: null,
    sort: sortId,
    ...(filters.regionName ? {} : { region: null })
  });

  return (
    <main className="page-shell">
      <ElectionTypeTabs activeTab={activeTab} />
      <section className="workspace-header public-header education-header">
        <div>
          <p className="eyebrow">2026 전국동시지방선거</p>
          <h1>교육감 후보 공약 검색</h1>
          <p className="lead">
            지역, 후보자 이름, 정책축으로 교육감 후보자의 공약과 원문 자료를
            확인하세요. 성향은 공약 원문 기반 자동 추정값입니다.
          </p>
          <div className="education-hero-actions">
            <Link className="action-button primary" href="#candidate-list-title">
              후보 목록으로 이동
            </Link>
            <Link
              className="action-button secondary"
              href="/analysis/education-wordcloud"
            >
              핵심 키워드 분석 보기
            </Link>
          </div>
        </div>
      </section>

      {invalidRegions.length > 0 ? (
        <section className="data-warning" role="status">
          <strong>지역명 확인 필요</strong>
          <p>
            {invalidRegions
              .map((region) => `${region.regionName} ${region.count}명`)
              .join(", ")}
            은 공식 시·도 명칭과 달라 데이터 정규화 검증이 필요합니다.
          </p>
        </section>
      ) : null}

      <section
        aria-labelledby="candidate-search-title"
        className="panel filter-panel search-panel"
      >
        <div className="search-panel-heading">
          <div>
            <h2 id="candidate-search-title">후보자 찾기</h2>
            <p>
              이름, 지역, 정책축, 성향, 전과 공개자료, 당선여부를 조합해 원하는
              후보자를 찾아보세요.
            </p>
          </div>
        </div>
        <form className="filter-form education-filter-form">
          <input name="election" type="hidden" value="education" />
          <input name="office" type="hidden" value="education_superintendent" />
          {policyAxisId ? (
            <input name="policyAxis" type="hidden" value={policyAxisId} />
          ) : null}
          {compareQuery ? (
            <input name="compare" type="hidden" value={compareQuery} />
          ) : null}
          <label>
            <span>검색어</span>
            <input
              defaultValue={filters.query ?? ""}
              name="q"
              placeholder="후보자 이름, 지역"
              type="search"
            />
          </label>
          <label>
            <span>지역</span>
            <select defaultValue={filters.regionName ?? ""} name="region">
              <option value="">전체</option>
              {educationOptions.regions.map((region) => (
                <option key={region} value={region}>
                  {regionOptionLabel(region)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>성향</span>
            <select defaultValue={orientationId ?? ""} name="orientation">
              <option value="">전체</option>
              {educationOrientationOptions.map((orientation) => (
                <option key={orientation.id} value={orientation.id}>
                  {orientation.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>전과 공개자료</span>
            <select
              defaultValue={criminalRecordStatus ?? ""}
              name="criminalRecord"
            >
              <option value="">전체</option>
              {criminalRecordFilterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>당선여부</span>
            <select
              defaultValue={electionResultStatus ?? ""}
              name="electionResult"
            >
              <option value="">전체</option>
              {electionResultFilterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>정렬</span>
            <select defaultValue={sortId} name="sort">
              {educationSortOptions.map((sortOption) => (
                <option key={sortOption.id} value={sortOption.id}>
                  {sortOption.label}
                </option>
              ))}
            </select>
          </label>
          <input name="page" type="hidden" value="1" />
          <div className="filter-actions">
            <button type="submit">검색</button>
            {hasActiveFilters ? (
              <Link
                href={buildEducationHref(params, {
                  criminalRecord: null,
                  electionResult: null,
                  orientation: null,
                  page: 1,
                  policyAxis: null,
                  q: null,
                  region: null,
                  sort: null
                })}
              >
                초기화
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {policyAxisOptions.length > 0 ? (
        <section className="policy-axis-filter" aria-label="정책축 빠른 필터">
          <strong>정책축</strong>
          <div>
            <Link
              aria-current={!policyAxisId ? "true" : undefined}
              className={`policy-axis-chip ${!policyAxisId ? "active" : ""}`}
              href={buildEducationHref(params, { page: 1, policyAxis: null })}
            >
              전체
            </Link>
            {policyAxisOptions.slice(0, 8).map((axis) => (
              <Link
                aria-current={policyAxisId === axis.id ? "true" : undefined}
                className={`policy-axis-chip ${
                  policyAxisId === axis.id ? "active" : ""
                }`}
                href={buildEducationHref(params, {
                  page: 1,
                  policyAxis: axis.id
                })}
                key={axis.id}
              >
                {axis.label}
                <span>{axis.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {hasActiveFilters ? (
        <section className="result-summary" aria-label="검색 결과 요약">
          <strong>{resultSummaryTitle(filters)}</strong>
          <span>{sortedCandidates.length.toLocaleString("ko-KR")}명</span>
          <span>공약 {summary.totalPledges.toLocaleString("ko-KR")}개</span>
          <span>
            {summary.collectedMaterials > 0 ? "원문 자료 있음" : "원문 자료 없음"}
          </span>
          {selectedFilters.length > 0 ? (
            <em>{selectedFilters.join(" · ")}</em>
          ) : null}
        </section>
      ) : null}

      {compareCandidates.length > 0 ? (
        <section
          aria-labelledby="candidate-compare-title"
          className="panel compare-panel"
        >
          <div className="panel-heading">
            <div>
              <h2 id="candidate-compare-title">선택 후보 비교</h2>
              <p>최대 4명까지 같은 기준으로 빠르게 비교합니다.</p>
            </div>
            <Link
              className="detail-text-link"
              href={buildEducationHref(params, { compare: null })}
            >
              비교 비우기
            </Link>
          </div>
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
                <tr>
                  <th scope="row">공약 수</th>
                  {compareCandidates.map((candidate) => (
                    <td key={candidate.id}>{candidate.pledges.length}개</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">전과기록</th>
                  {compareCandidates.map((candidate) => (
                    <td key={candidate.id}>
                      <strong>{criminalRecordLabel(candidate.criminalRecord)}</strong>
                      <span className="compare-cell-note">
                        {criminalRecordDetail(candidate.criminalRecord)}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">정책축</th>
                  {compareCandidates.map((candidate) => {
                    const profile =
                      compareProfiles.get(candidate.id) ??
                      classifyEducationCandidate(candidate);
                    return (
                      <td key={candidate.id}>
                        {educationProfilePolicyAxes(profile) || "분류 전"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th scope="row">근거 키워드</th>
                  {compareCandidates.map((candidate) => {
                    const profile =
                      compareProfiles.get(candidate.id) ??
                      classifyEducationCandidate(candidate);
                    return (
                      <td key={candidate.id}>
                        {educationProfileEvidence(profile) || "근거 부족"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th scope="row">원문</th>
                  {compareCandidates.map((candidate) => {
                    const materialUrl = candidateMaterialUrl(candidate);
                    const electionBulletinUrl = candidateElectionBulletinUrl(candidate);
                    return (
                      <td key={candidate.id}>
                        {materialUrl ? (
                          <a href={materialUrl} rel="noreferrer" target="_blank">
                            5대공약
                          </a>
                        ) : (
                          "5대공약 없음"
                        )}
                        {electionBulletinUrl ? (
                          <>
                            {" / "}
                            <a
                              href={electionBulletinUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              선거공보
                            </a>
                          </>
                        ) : (
                          " / 선거공보 없음"
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          {compareCandidates.length === 1 ? (
            <p className="compare-hint">
              후보 카드에서 한 명을 더 추가하면 차이를 나란히 볼 수 있습니다.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="panel candidate-section">
        <div className="panel-heading candidate-heading">
          <div>
            <h2 id="candidate-list-title">
              {hasActiveFilters ? "검색 결과" : "후보자 목록"}
            </h2>
            <p>
              후보자 이름을 선택하면 상세 정보와 주요 공약을 확인할 수 있습니다.
            </p>
          </div>
          <span>
            {sortedCandidates.length.toLocaleString("ko-KR")}명 중{" "}
            {candidates.length.toLocaleString("ko-KR")}명 표시
          </span>
        </div>

        {candidates.length > 0 ? (
          <div className="candidate-list">
            {candidates.map((candidate) => {
              const materialUrl = candidateMaterialUrl(candidate);
              const electionBulletinUrl = candidateElectionBulletinUrl(candidate);
              const profile =
                candidateProfiles.get(candidate.id) ??
                classifyEducationCandidate(candidate);
              const evidence = educationProfileEvidence(profile);
              const policyAxes = educationProfilePolicyAxes(profile);
              const isCompared = compareIds.includes(candidate.id);
              const compareIsFull = compareIds.length >= 4 && !isCompared;
              const resultLabel = electionResultLabel(candidate);
              const voteRate =
                typeof candidate.result?.voteRate === "number"
                  ? formatVoteRate(candidate.result.voteRate)
                  : undefined;

              return (
                <article className="candidate-card" key={candidate.id}>
                  <div className="candidate-main">
                    <div className="candidate-title-row">
                      <Link
                        className="candidate-name"
                        href={`/candidates/${candidate.id}`}
                      >
                        {candidate.candidateName}
                      </Link>
                      {hasVisibleBallotNumber(candidate.ballotNumber) ? (
                        <span className="ballot-chip">
                          기호 {candidate.ballotNumber}
                        </span>
                      ) : null}
                      {resultLabel ? (
                        <span
                          className={`election-result-chip ${electionResultClass(candidate)}`}
                        >
                          {resultLabel}
                        </span>
                      ) : null}
                      <span
                        className={`orientation-chip ${profile.orientation.colorClass}`}
                        title={`진보 ${profile.progressiveScore}점 / 보수 ${profile.conservativeScore}점`}
                      >
                        {profile.orientation.label}
                      </span>
                      <span
                        className={`criminal-record-chip ${criminalRecordClass(
                          candidate.criminalRecord
                        )}`}
                        title={criminalRecordDetail(candidate.criminalRecord)}
                      >
                        {criminalRecordLabel(candidate.criminalRecord)}
                      </span>
                    </div>
                    <div className="candidate-meta">
                      <span>{candidateLocation(candidate)}</span>
                      <span>{officeLabels[candidate.officeType]}</span>
                    </div>
                    <div className="candidate-submeta">
                      <span>{candidate.officeName}</span>
                      <span>
                        공약 {candidate.pledges.length.toLocaleString("ko-KR")}개
                      </span>
                      {voteRate ? <span>득표율 {voteRate}</span> : null}
                      <span>
                        {materialUrl ? "5대공약 자료 있음" : "5대공약 자료 없음"}
                      </span>
                    </div>
                    <div className="candidate-orientation-detail">
                      {policyAxes ? <span>정책축 {policyAxes}</span> : null}
                      {evidence ? <span>근거 {evidence}</span> : null}
                      {candidate.criminalRecord ? (
                        <span>
                          전과 공개자료 {criminalRecordDetail(candidate.criminalRecord)}
                        </span>
                      ) : null}
                    </div>
                    {profile.policyAxes.length > 0 ? (
                      <div
                        aria-label={`${candidate.candidateName} 정책축 필터`}
                        className="candidate-policy-tags"
                      >
                        {profile.policyAxes.slice(0, 3).map((axis) => (
                          <Link
                            className={`policy-axis-chip ${
                              policyAxisId === axis.id ? "active" : ""
                            }`}
                            href={buildEducationHref(params, {
                              page: 1,
                              policyAxis: axis.id
                            })}
                            key={axis.id}
                          >
                            {axis.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="candidate-actions">
                    {compareIsFull ? (
                      <span
                        aria-disabled="true"
                        className="action-button disabled"
                      >
                        최대 4명
                      </span>
                    ) : (
                      <Link
                        className={`action-button ${
                          isCompared ? "secondary" : "tertiary"
                        }`}
                        href={compareToggleHref({
                          candidateId: candidate.id,
                          compareIds,
                          params
                        })}
                      >
                        {isCompared ? "비교 해제" : "비교에 추가"}
                      </Link>
                    )}
                    <Link
                      className="action-button primary"
                      href={`/candidates/${candidate.id}#pledges`}
                    >
                      공약 보기
                    </Link>
                    {materialUrl ? (
                      <a
                        className="action-button secondary"
                        href={materialUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        5대공약 보기
                      </a>
                    ) : (
                      <span className="action-button disabled">5대공약 없음</span>
                    )}
                    {electionBulletinUrl ? (
                      <a
                        className="action-button tertiary"
                        href={electionBulletinUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        선거공보 보기
                      </a>
                    ) : (
                      <span className="action-button disabled">선거공보 없음</span>
                    )}
                    <Link
                      className="detail-text-link"
                      href={`/candidates/${candidate.id}`}
                    >
                      후보자 상세
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-result">
            <strong>조건에 맞는 후보자가 없습니다.</strong>
            <p>
              검색어를 줄이거나 지역/성향/정책축/전과/당선여부 조건을
              변경해보세요.
            </p>
            <div className="empty-actions">
              <Link className="action-button primary" href="/?election=education">
                전체 후보 보기
              </Link>
              <Link className="action-button secondary" href={relaxedHref}>
                조건 완화하기
              </Link>
              <Link
                className="action-button secondary"
                href="/analysis/education-wordcloud"
              >
                키워드 분석 보기
              </Link>
            </div>
          </div>
        )}

        {pagination.totalPages > 1 ? (
          <nav className="pagination" aria-label="후보자 목록 페이지">
            {pagination.page <= 1 ? (
              <span aria-disabled="true" className="pagination-disabled">
                이전
              </span>
            ) : (
              <Link href={buildEducationHref(params, { page: pagination.page - 1 })}>
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
              <Link href={buildEducationHref(params, { page: pagination.page + 1 })}>
                다음
              </Link>
            )}
          </nav>
        ) : null}
      </section>

      {summary.totalCandidates > 1 ? (
        <details className="stats-disclosure">
          <summary>전체 통계 보기</summary>
          <section className="content-grid compact-stats" aria-label="후보자 통계">
            <article className="panel">
              <div className="panel-heading">
                <h2>선거 종류별 후보자</h2>
                <span>{summary.byOffice.length}개 분류</span>
              </div>
              <div className="office-list">
                {summary.byOffice.map((office) => (
                  <div className="office-row" key={office.officeType}>
                    <span>{office.label}</span>
                    <strong>{office.count.toLocaleString("ko-KR")}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <h2>지역별 후보자</h2>
                <span>{summary.byRegion.length}개 지역</span>
              </div>
              <div className="region-bars">
                {summary.byRegion.slice(0, 12).map((region) => (
                  <div className="region-row" key={region.regionName}>
                    <span>{region.regionName}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${
                            summary.totalCandidates > 0
                              ? (region.count / summary.totalCandidates) * 100
                              : 0
                          }%`
                        }}
                      />
                    </div>
                    <strong>{region.count}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </details>
      ) : null}
    </main>
  );
}
