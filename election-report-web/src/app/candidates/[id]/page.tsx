import Link from "next/link";
import { notFound } from "next/navigation";

import { getElectionCandidateById } from "../../../lib/election-db";
import { officeLabels } from "../../../lib/election-stats";
import type { Candidate } from "../../../types/election";

export const dynamic = "force-dynamic";

type CandidateMaterial = NonNullable<Candidate["material"]["materials"]>[number];

const materialTypeLabels: Record<string, string> = {
  ELECTION_BULLETIN: "후보자 공보 원문",
  PLEDGE_BOOK: "선거공약서 원문",
  TOP_FIVE_PLEDGES: "5대 공약 원문"
};

type CandidatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

function hasSourceUrl(
  material: CandidateMaterial
): material is CandidateMaterial & { sourceUrl: string } {
  return Boolean(material.sourceUrl);
}

function materialTypeLabel(materialType: string) {
  return materialTypeLabels[materialType] ?? "원문 자료";
}

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const candidate = await getElectionCandidateById(id);

  if (!candidate) {
    notFound();
  }

  const materialUrl = candidateMaterialUrl(candidate);
  const visibleMaterials = (candidate.material.materials ?? []).filter(hasSourceUrl);

  return (
    <main className="page-shell detail-page">
      <Link className="back-link" href="/">
        후보자 검색으로 돌아가기
      </Link>

      <section className="detail-header public-detail-header">
        <div>
          <p className="eyebrow">
            {officeLabels[candidate.officeType]} · {candidateLocation(candidate)}
          </p>
          <h1>{candidate.candidateName}</h1>
          <p className="lead">
            {candidate.partyName} · {candidate.officeName}
            {hasVisibleBallotNumber(candidate.ballotNumber)
              ? ` · 기호 ${candidate.ballotNumber}`
              : ""}
          </p>
        </div>
        <div className="detail-actions">
          <a className="action-button primary" href="#pledges">
            공약 보기
          </a>
          {materialUrl ? (
            <a
              className="action-button secondary"
              href={materialUrl}
              rel="noreferrer"
              target="_blank"
            >
              원문 보기
            </a>
          ) : null}
        </div>
      </section>

      <section className="content-grid detail-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>후보자 정보</h2>
          </div>
          <dl className="info-list">
            <div>
              <dt>선거명</dt>
              <dd>{candidate.electionName}</dd>
            </div>
            <div>
              <dt>지역</dt>
              <dd>{candidateLocation(candidate)}</dd>
            </div>
            <div>
              <dt>선거 종류</dt>
              <dd>{officeLabels[candidate.officeType]}</dd>
            </div>
            <div>
              <dt>정당</dt>
              <dd>{candidate.partyName}</dd>
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

        <article className="panel source-panel">
          <div className="panel-heading">
            <div>
              <h2>원문 자료</h2>
              <p>선거관리위원회에 공개된 후보자 자료를 새 창에서 확인합니다.</p>
            </div>
            <span>{visibleMaterials.length.toLocaleString("ko-KR")}개</span>
          </div>
          {visibleMaterials.length > 0 ? (
            <div className="material-link-list">
              {visibleMaterials.map((material) => (
                <div className="material-link-item" key={material.id}>
                  <div>
                    <strong>{material.title}</strong>
                    <span>{materialTypeLabel(material.materialType)}</span>
                  </div>
                  <a
                    className="action-button secondary"
                    href={material.sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    원문 열기
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-copy">현재 연결된 원문 자료가 없습니다.</p>
          )}
        </article>
      </section>

      <section className="panel" id="pledges">
        <div className="panel-heading">
          <h2>주요 공약</h2>
          <span>{candidate.pledges.length.toLocaleString("ko-KR")}개</span>
        </div>
        {candidate.pledges.length > 0 ? (
          <div className="pledge-list">
            {candidate.pledges.map((pledge) => (
              <article className="pledge-item" key={pledge.id}>
                <span>{pledge.category}</span>
                <h3>{pledge.title}</h3>
                <p>{pledge.summary}</p>
                {pledge.details.length > 0 ? (
                  <details>
                    <summary>공약 원문 보기</summary>
                    <ul>
                      {pledge.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-copy">등록된 주요 공약이 없습니다.</p>
        )}
      </section>
    </main>
  );
}
