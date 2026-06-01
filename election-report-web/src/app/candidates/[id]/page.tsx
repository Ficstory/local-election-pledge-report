import Link from "next/link";
import { notFound } from "next/navigation";
import { mockCandidates } from "../../../data/mock-candidates";
import { getCandidateById, officeLabels } from "../../../lib/election-stats";

const materialStatusLabels = {
  pending: "수집 전",
  collected: "수집 완료",
  analyzed: "분석 완료"
};

type CandidatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export function generateStaticParams() {
  return mockCandidates.map((candidate) => ({
    id: candidate.id
  }));
}

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const candidate = getCandidateById(mockCandidates, id);

  if (!candidate) {
    notFound();
  }

  return (
    <main className="page-shell detail-page">
      <Link className="back-link" href="/">
        ← 후보자 목록
      </Link>

      <section className="detail-header">
        <div>
          <p className="eyebrow">
            {officeLabels[candidate.officeType]} · {candidate.regionName}
          </p>
          <h1>{candidate.candidateName}</h1>
          <p className="lead">
            {candidate.officeName} / {candidate.partyName} / 기호{" "}
            {candidate.ballotNumber}
          </p>
        </div>
        <span className={`status-pill ${candidate.material.status}`}>
          {materialStatusLabels[candidate.material.status]}
        </span>
      </section>

      <section className="content-grid detail-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>기본정보</h2>
          </div>
          <dl className="info-list">
            <div>
              <dt>선거명</dt>
              <dd>{candidate.electionName}</dd>
            </div>
            <div>
              <dt>선거ID</dt>
              <dd>{candidate.electionId}</dd>
            </div>
            <div>
              <dt>연령/성별</dt>
              <dd>
                {candidate.age}세 / {candidate.gender}
              </dd>
            </div>
            <div>
              <dt>직업</dt>
              <dd>{candidate.job}</dd>
            </div>
            <div>
              <dt>학력</dt>
              <dd>{candidate.education}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>공보물 분석</h2>
          </div>
          <dl className="info-list">
            <div>
              <dt>페이지</dt>
              <dd>{candidate.material.pageCount ?? "수집 후 기록"}</dd>
            </div>
            <div>
              <dt>주요 색상</dt>
              <dd className="swatch-row">
                {candidate.material.dominantColors.length > 0
                  ? candidate.material.dominantColors.map((color) => (
                      <span
                        aria-label={color}
                        className="color-swatch"
                        key={color}
                        style={{ background: color }}
                      />
                    ))
                  : "수집 후 기록"}
              </dd>
            </div>
            <div>
              <dt>폰트</dt>
              <dd>{candidate.material.fontNotes}</dd>
            </div>
            <div>
              <dt>구성</dt>
              <dd>{candidate.material.layoutNotes}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>주요 공약</h2>
          <span>{candidate.pledges.length}개</span>
        </div>
        <div className="pledge-list">
          {candidate.pledges.map((pledge) => (
            <article className="pledge-item" key={pledge.id}>
              <span>{pledge.category}</span>
              <h3>{pledge.title}</h3>
              <p>{pledge.summary}</p>
              <ul>
                {pledge.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>API 매핑</h2>
        </div>
        <dl className="info-list compact">
          <div>
            <dt>후보자 API ID</dt>
            <dd>{candidate.source.candidateApiId ?? "미연결"}</dd>
          </div>
          <div>
            <dt>공약 API ID</dt>
            <dd>{candidate.source.pledgeApiId ?? "미연결"}</dd>
          </div>
          <div>
            <dt>수집시각</dt>
            <dd>{candidate.source.fetchedAt ?? "수집 전"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
