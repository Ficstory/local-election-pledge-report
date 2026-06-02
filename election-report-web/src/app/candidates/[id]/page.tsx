import Link from "next/link";
import { notFound } from "next/navigation";

import { officeLabels } from "../../../lib/election-stats";
import { getElectionCandidateById } from "../../../lib/election-db";

export const dynamic = "force-dynamic";

const materialStatusLabels = {
  pending: "수집 전",
  collected: "수집 완료",
  analyzed: "분석 완료"
};

const downloadStatusLabels: Record<string, string> = {
  DOWNLOADED: "다운로드 완료",
  FAILED: "실패",
  METADATA_ONLY: "메타데이터만",
  SKIPPED_NO_URL: "URL 없음"
};

type CandidatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatBytes(bytes: number | undefined) {
  if (bytes === undefined) {
    return "미기록";
  }

  return `${bytes.toLocaleString("ko-KR")} bytes`;
}

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const candidate = await getElectionCandidateById(id);

  if (!candidate) {
    notFound();
  }

  return (
    <main className="page-shell detail-page">
      <Link className="back-link" href="/">
        후보자 목록
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
            <h2>기본 정보</h2>
          </div>
          <dl className="info-list">
            <div>
              <dt>선거명</dt>
              <dd>{candidate.electionName}</dd>
            </div>
            <div>
              <dt>선거 ID</dt>
              <dd>{candidate.electionId}</dd>
            </div>
            <div>
              <dt>연령/성별</dt>
              <dd>
                {candidate.age > 0 ? `${candidate.age}세` : "미기재"} /{" "}
                {candidate.gender}
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
            {candidate.careers.length > 0 ? (
              <div>
                <dt>경력</dt>
                <dd>
                  <ul className="career-list">
                    {candidate.careers.map((career) => (
                      <li key={career}>{career}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
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
          <h2>선거자료</h2>
          <span>{candidate.material.materialCount ?? 0}개</span>
        </div>
        {candidate.material.materials?.length ? (
          <div className="table-wrap">
            <table className="material-table">
              <thead>
                <tr>
                  <th>자료명</th>
                  <th>메타데이터</th>
                  <th>다운로드</th>
                  <th>원본 CDN</th>
                  <th>로컬 저장 경로</th>
                  <th>sha256</th>
                  <th>fileSizeBytes</th>
                </tr>
              </thead>
              <tbody>
                {candidate.material.materials.map((material) => (
                  <tr key={material.id}>
                    <td>
                      <span className="region-name">{material.title}</span>
                      <small>{material.materialType}</small>
                    </td>
                    <td>
                      {material.metadataCollectedAt ? "수집됨" : "미수집"}
                      {material.metadataCollectedAt ? (
                        <small>{material.metadataCollectedAt}</small>
                      ) : null}
                    </td>
                    <td>
                      {downloadStatusLabels[material.downloadStatus] ??
                        material.downloadStatus}
                      {material.collectedAt ? (
                        <small>{material.collectedAt}</small>
                      ) : null}
                    </td>
                    <td>
                      {material.sourceUrl ? (
                        <a
                          className="text-link"
                          href={material.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          CDN 열기
                        </a>
                      ) : (
                        "없음"
                      )}
                    </td>
                    <td>{material.storagePath ?? "미저장"}</td>
                    <td>
                      {material.sha256 ? (
                        <code className="hash-text">{material.sha256}</code>
                      ) : (
                        "미기록"
                      )}
                    </td>
                    <td>{formatBytes(material.fileSizeBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-copy">수집된 선거자료 메타데이터가 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>주요 공약</h2>
          <span>{candidate.pledges.length.toLocaleString("ko-KR")}개</span>
        </div>
        <div className="pledge-list">
          {candidate.pledges.map((pledge) => (
            <article className="pledge-item" key={pledge.id}>
              <span>{pledge.category}</span>
              <h3>{pledge.title}</h3>
              <p>{pledge.summary}</p>
              <details>
                <summary>공약 원문 보기</summary>
                <ul>
                  {pledge.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </details>
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
            <dt>수집 시각</dt>
            <dd>{candidate.source.fetchedAt ?? "수집 전"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
