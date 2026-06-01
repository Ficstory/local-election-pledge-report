import Link from "next/link";
import { mockCandidates } from "../data/mock-candidates";
import { getElectionSummary, officeLabels } from "../lib/election-stats";

const materialStatusLabels = {
  pending: "수집 전",
  collected: "수집 완료",
  analyzed: "분석 완료"
};

export default function Home() {
  const summary = getElectionSummary(mockCandidates);

  return (
    <main className="page-shell">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">제9회 전국동시지방선거 리포트 준비</p>
          <h1>후보자 공약 및 공보물 분석 대시보드</h1>
          <p className="lead">
            공식 API 수집 전까지 mock 데이터로 화면과 데이터 구조를 먼저
            고정합니다.
          </p>
        </div>
        <div className="sync-panel" aria-label="수집 상태">
          <span className="sync-label">기준 선거ID</span>
          <strong>20260603</strong>
          <span className="sync-note">CommonCodeService로 최종 확인 예정</span>
        </div>
      </section>

      <section className="metric-grid" aria-label="요약 지표">
        <article className="metric-card">
          <span>후보자</span>
          <strong>{summary.totalCandidates.toLocaleString("ko-KR")}</strong>
          <p>시장/도지사, 기초단체장, 교육감</p>
        </article>
        <article className="metric-card">
          <span>공약 항목</span>
          <strong>{summary.totalPledges.toLocaleString("ko-KR")}</strong>
          <p>후보자별 주요 공약 합계</p>
        </article>
        <article className="metric-card">
          <span>공보물</span>
          <strong>{summary.collectedMaterials.toLocaleString("ko-KR")}</strong>
          <p>수집 또는 분석 완료 상태</p>
        </article>
        <article className="metric-card accent">
          <span>데이터 모드</span>
          <strong>MOCK</strong>
          <p>API 수집 스크립트 연결 전 단계</p>
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
                <strong>{office.count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>지역별 샘플 분포</h2>
            <span>{summary.byRegion.length}개 지역</span>
          </div>
          <div className="region-bars">
            {summary.byRegion.map((region) => (
              <div className="region-row" key={region.regionName}>
                <span>{region.regionName}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(region.count / summary.totalCandidates) * 100}%`
                    }}
                  />
                </div>
                <strong>{region.count}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel candidate-section">
        <div className="panel-heading">
          <div>
            <h2>후보자 목록</h2>
            <p>공식 후보자 API 응답을 이 구조로 적재할 예정입니다.</p>
          </div>
          <span>{mockCandidates.length}명</span>
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
              {mockCandidates.map((candidate) => (
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
                  <td>{candidate.pledges.length}개</td>
                  <td>
                    <span className={`status-pill ${candidate.material.status}`}>
                      {materialStatusLabels[candidate.material.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
