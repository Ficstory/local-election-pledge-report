import Link from "next/link";

import {
  type CandidateListFilters,
  listElectionCandidatePage
} from "../lib/election-db";
import { getElectionSummary, officeLabels } from "../lib/election-stats";
import type { OfficeType } from "../types/election";

export const dynamic = "force-dynamic";

const materialStatusLabels = {
  pending: "수집 전",
  collected: "수집 완료",
  analyzed: "분석 완료"
};

const validOfficeTypes: OfficeType[] = [
  "governor",
  "municipal_mayor",
  "education_superintendent"
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

function parseOffice(value: string | undefined): OfficeType | undefined {
  return validOfficeTypes.includes(value as OfficeType)
    ? (value as OfficeType)
    : undefined;
}

function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number
) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "office", "region", "party"]) {
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

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const filters: CandidateListFilters = {
    officeType: parseOffice(singleParam(params, "office")),
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
  const { candidates, options, pagination } = result;
  const summary = getElectionSummary(result.summaryCandidates);
  const hasActiveFilters = Boolean(
    filters.query || filters.officeType || filters.regionName || filters.partyName
  );

  return (
    <main className="page-shell">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">2026 전국동시지방선거 리포트</p>
          <h1>후보자 공약 데이터 대시보드</h1>
          <p className="lead">
            공식 공공데이터 API에서 수집한 후보자와 공약 데이터를 로컬
            PostgreSQL 기준으로 검색하고 검수합니다.
          </p>
        </div>
        <div className="sync-panel" aria-label="수집 상태">
          <span className="sync-label">기준 선거 ID</span>
          <strong>20260603</strong>
          <span className="sync-note">PostgreSQL 데이터 연결 중</span>
        </div>
      </section>

      <section className="metric-grid" aria-label="요약 지표">
        <article className="metric-card">
          <span>후보자</span>
          <strong>{summary.totalCandidates.toLocaleString("ko-KR")}</strong>
          <p>현재 검색 조건에 맞는 후보자 수</p>
        </article>
        <article className="metric-card">
          <span>공약 항목</span>
          <strong>{summary.totalPledges.toLocaleString("ko-KR")}</strong>
          <p>후보자별 공식 공약 슬롯을 펼친 항목 수</p>
        </article>
        <article className="metric-card">
          <span>공보물</span>
          <strong>{summary.collectedMaterials.toLocaleString("ko-KR")}</strong>
          <p>수집 또는 분석 완료 상태</p>
        </article>
        <article className="metric-card accent">
          <span>데이터 모드</span>
          <strong>DB</strong>
          <p>로컬 PostgreSQL에서 직접 조회</p>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>선거종류별 후보자</h2>
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
            <h2>지역별 후보자 분포</h2>
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

      <section className="panel filter-panel">
        <form className="filter-form">
          <label>
            <span>검색</span>
            <input
              defaultValue={filters.query ?? ""}
              name="q"
              placeholder="후보자, 정당, 지역"
              type="search"
            />
          </label>
          <label>
            <span>선거종류</span>
            <select defaultValue={filters.officeType ?? ""} name="office">
              <option value="">전체</option>
              {validOfficeTypes.map((officeType) => (
                <option key={officeType} value={officeType}>
                  {officeLabels[officeType]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>지역</span>
            <select defaultValue={filters.regionName ?? ""} name="region">
              <option value="">전체</option>
              {options.regions.map((region) => (
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
              {options.parties.map((party) => (
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

      <section className="panel candidate-section">
        <div className="panel-heading">
          <div>
            <h2>후보자 목록</h2>
            <p>후보자 상세 화면에서 공식 공약 원문을 확인할 수 있습니다.</p>
          </div>
          <span>
            {pagination.totalCount.toLocaleString("ko-KR")}명 중{" "}
            {candidates.length.toLocaleString("ko-KR")}명 표시
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>지역</th>
                <th>선거</th>
                <th>후보자</th>
                <th>정당</th>
                <th>공약</th>
                <th>공보물</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td>
                    <span className="region-name">{candidate.regionName}</span>
                    {candidate.districtName ? (
                      <span className="district-name">
                        {candidate.districtName}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span>{officeLabels[candidate.officeType]}</span>
                    <small>{candidate.officeName}</small>
                  </td>
                  <td>
                    <Link href={`/candidates/${candidate.id}`}>
                      {candidate.candidateName}
                    </Link>
                    <small>기호 {candidate.ballotNumber}</small>
                  </td>
                  <td>{candidate.partyName}</td>
                  <td>{candidate.pledges.length.toLocaleString("ko-KR")}개</td>
                  <td>
                    <span className={`status-pill ${candidate.material.status}`}>
                      {materialStatusLabels[candidate.material.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {candidates.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan={6}>
                    검색 조건에 맞는 후보자가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <nav className="pagination" aria-label="후보자 목록 페이지">
          <Link
            aria-disabled={pagination.page <= 1}
            className={pagination.page <= 1 ? "disabled" : ""}
            href={buildPageHref(params, pagination.page - 1)}
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
            href={buildPageHref(params, pagination.page + 1)}
          >
            다음
          </Link>
        </nav>
      </section>
    </main>
  );
}
