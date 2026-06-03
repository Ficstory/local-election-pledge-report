import Link from "next/link";

import { MayorPledgeAnalysis } from "./MayorPledgeAnalysis";
import {
  type CandidateListFilters,
  listElectionCandidatesByFilters,
  listElectionCandidatePage
} from "../lib/election-db";
import { getElectionSummary, officeLabels } from "../lib/election-stats";
import {
  analyzeMayorPledges,
  isMayorCandidate,
  type MayorPledgeFilter
} from "../lib/mayor-pledge-analysis";
import type { Candidate } from "../types/election";

export const dynamic = "force-dynamic";

type ElectionTabId = "education" | "mayor";

const electionTabs: Array<{
  id: ElectionTabId;
  label: string;
  description: string;
}> = [
  {
    id: "education",
    label: "교육감",
    description: officeLabels.education_superintendent
  },
  {
    id: "mayor",
    label: "시장",
    description: "시장 후보"
  }
];

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

function parseElectionTab(value: string | undefined): ElectionTabId {
  return electionTabs.some((tab) => tab.id === value)
    ? (value as ElectionTabId)
    : "education";
}

function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
  activeTab: ElectionTabId
) {
  const nextParams = new URLSearchParams();
  nextParams.set("election", activeTab);

  for (const key of ["q", "region", "party"]) {
    const value = singleParam(params, key)?.trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  const query = nextParams.toString();
  return query ? `/?${query}` : "/";
}

function buildTabHref(tabId: ElectionTabId) {
  return `/?election=${tabId}`;
}

function candidateMaterialUrl(candidate: Candidate) {
  return (
    candidate.material.pdfUrl ??
    candidate.material.materials?.find((material) => material.sourceUrl)?.sourceUrl
  );
}

function candidateLocation(candidate: Candidate) {
  return candidate.districtName && candidate.districtName !== candidate.regionName
    ? `${candidate.regionName} ${candidate.districtName}`
    : candidate.regionName;
}

function hasVisibleBallotNumber(ballotNumber: string) {
  return ballotNumber.trim() !== "" && ballotNumber !== "없음";
}

function resultSummaryTitle(filters: CandidateListFilters) {
  return filters.query
    ? `"${filters.query}" 검색 결과`
    : "선택한 조건의 검색 결과";
}

function uniqueSorted(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((left, right) => left.localeCompare(right, "ko"));
}

function buildMayorOptions(
  mayorCandidates: Candidate[],
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

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const activeTab = parseElectionTab(singleParam(params, "election"));

  if (activeTab === "mayor") {
    const executiveCandidateGroups = await Promise.all([
      listElectionCandidatesByFilters({ officeType: "governor" }),
      listElectionCandidatesByFilters({ officeType: "municipal_mayor" })
    ]);
    const mayorCandidates = executiveCandidateGroups
      .flat()
      .filter(isMayorCandidate);
    const mayorFilters: MayorPledgeFilter = {
      candidateId: singleParam(params, "candidate")?.trim() || undefined,
      partyName: singleParam(params, "party")?.trim() || undefined,
      query: singleParam(params, "q")?.trim() || undefined,
      regionName: singleParam(params, "region")?.trim() || undefined
    };
    const mayorAnalysis = analyzeMayorPledges(mayorCandidates, mayorFilters);

    return (
      <main className="page-shell mayor-page">
        <ElectionTypeTabs activeTab={activeTab} />
        <MayorPledgeAnalysis
          analysis={{
            candidateKeywords: mayorAnalysis.candidateKeywords,
            keywords: mayorAnalysis.keywords,
            pledgeItems: mayorAnalysis.pledgeItems,
            policyCategories: mayorAnalysis.policyCategories
          }}
          filters={mayorFilters}
          options={buildMayorOptions(mayorCandidates, mayorFilters)}
        />
      </main>
    );
  }

  const filters: CandidateListFilters = {
    officeType: "education_superintendent",
    partyName: singleParam(params, "party")?.trim() || undefined,
    query: singleParam(params, "q")?.trim() || undefined,
    regionName: singleParam(params, "region")?.trim() || undefined
  };
  const page = parsePage(singleParam(params, "page"));
  const result = await listElectionCandidatePage({
    filters,
    page,
    pageSize: 50
  });
  const { candidates, pagination } = result;
  const summary = getElectionSummary(result.summaryCandidates);
  const hasActiveFilters = Boolean(
    filters.query || filters.regionName || filters.partyName
  );
  const educationOptions = {
    regions: uniqueSorted(
      result.summaryCandidates.map((candidate) => candidate.regionName)
    ),
    parties: uniqueSorted(result.summaryCandidates.map((candidate) => candidate.partyName))
  };
  const selectedFilters = [
    officeLabels.education_superintendent,
    filters.regionName,
    filters.partyName
  ].filter((filter): filter is string => Boolean(filter));

  return (
    <main className="page-shell">
      <ElectionTypeTabs activeTab={activeTab} />
      <section className="workspace-header public-header">
        <div>
          <p className="eyebrow">2026 전국동시지방선거</p>
          <h1>교육감 후보 공약 검색</h1>
          <p className="lead">
            지역, 후보자 이름, 정당으로 교육감 후보자의 공약과 원문 자료를
            확인하세요.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="candidate-search-title"
        className="panel filter-panel search-panel"
      >
        <div className="search-panel-heading">
          <div>
            <h2 id="candidate-search-title">후보자 찾기</h2>
            <p>이름, 지역, 정당을 조합해 원하는 후보자를 찾아보세요.</p>
          </div>
        </div>
        <form className="filter-form">
          <input name="election" type="hidden" value="education" />
          <input name="office" type="hidden" value="education_superintendent" />
          <label>
            <span>검색어</span>
            <input
              defaultValue={filters.query ?? ""}
              name="q"
              placeholder="후보자 이름, 정당, 지역"
              type="search"
            />
          </label>
          <label>
            <span>지역</span>
            <select defaultValue={filters.regionName ?? ""} name="region">
              <option value="">전체</option>
              {educationOptions.regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>정당</span>
            <select defaultValue={filters.partyName ?? ""} name="party">
              <option value="">전체</option>
              {educationOptions.parties.map((party) => (
                <option key={party} value={party}>
                  {party}
                </option>
              ))}
            </select>
          </label>
          <input name="page" type="hidden" value="1" />
          <div className="filter-actions">
            <button type="submit">검색</button>
            {hasActiveFilters ? <Link href="/">초기화</Link> : null}
          </div>
        </form>
      </section>

      {hasActiveFilters ? (
        <section className="result-summary" aria-label="검색 결과 요약">
          <strong>{resultSummaryTitle(filters)}</strong>
          <span>{pagination.totalCount.toLocaleString("ko-KR")}명</span>
          <span>공약 {summary.totalPledges.toLocaleString("ko-KR")}개</span>
          <span>
            {summary.collectedMaterials > 0 ? "원문 자료 있음" : "원문 자료 없음"}
          </span>
          {selectedFilters.length > 0 ? (
            <em>{selectedFilters.join(" · ")}</em>
          ) : null}
        </section>
      ) : null}

      <section className="panel candidate-section">
        <div className="panel-heading candidate-heading">
          <div>
            <h2>{hasActiveFilters ? "검색 결과" : "후보자 목록"}</h2>
            <p>
              후보자 이름을 선택하면 상세 정보와 주요 공약을 확인할 수
              있습니다.
            </p>
          </div>
          <span>
            {pagination.totalCount.toLocaleString("ko-KR")}명 중{" "}
            {candidates.length.toLocaleString("ko-KR")}명 표시
          </span>
        </div>

        {candidates.length > 0 ? (
          <div className="candidate-list">
            {candidates.map((candidate) => {
              const materialUrl = candidateMaterialUrl(candidate);

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
                    </div>
                    <div className="candidate-meta">
                      <span>{candidateLocation(candidate)}</span>
                      <span>{officeLabels[candidate.officeType]}</span>
                      <span>{candidate.partyName}</span>
                    </div>
                    <div className="candidate-submeta">
                      <span>{candidate.officeName}</span>
                      <span>
                        공약 {candidate.pledges.length.toLocaleString("ko-KR")}개
                      </span>
                      <span>
                        {materialUrl ? "원문 자료 있음" : "원문 자료 없음"}
                      </span>
                    </div>
                  </div>
                  <div className="candidate-actions">
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
                        원문 보기
                      </a>
                    ) : (
                      <span className="action-button disabled">원문 없음</span>
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
            <p>검색어를 줄이거나 지역/정당 조건을 변경해보세요.</p>
          </div>
        )}

        {pagination.totalPages > 1 ? (
          <nav className="pagination" aria-label="후보자 목록 페이지">
            <Link
              aria-disabled={pagination.page <= 1}
              className={pagination.page <= 1 ? "disabled" : ""}
              href={buildPageHref(params, pagination.page - 1, activeTab)}
            >
              이전
            </Link>
            <span>
              {pagination.page.toLocaleString("ko-KR")} /{" "}
              {pagination.totalPages.toLocaleString("ko-KR")}
            </span>
            <Link
              aria-disabled={pagination.page >= pagination.totalPages}
              className={
                pagination.page >= pagination.totalPages ? "disabled" : ""
              }
              href={buildPageHref(params, pagination.page + 1, activeTab)}
            >
              다음
            </Link>
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
