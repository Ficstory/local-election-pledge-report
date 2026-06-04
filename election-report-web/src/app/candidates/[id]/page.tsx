import Link from "next/link";
import { notFound } from "next/navigation";

import { officeLabels } from "../../../lib/election-stats";
import { getElectionCandidateById } from "../../../lib/election-db";
import type { Pledge } from "../../../types/election";
import { CandidateMaterials } from "./CandidateMaterials";
import { CandidateSourceInfo } from "./CandidateSourceInfo";

export const dynamic = "force-dynamic";

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

function firstSectionText(pledge: Pledge) {
  for (const section of pledge.detailSections ?? []) {
    const firstItem = section.items[0];

    if (firstItem) {
      return firstItem.text;
    }

    const firstLooseLine = section.looseLines[0];

    if (firstLooseLine) {
      return firstLooseLine;
    }
  }

  return pledge.summary;
}

function PledgeDetailContent({ pledge }: { pledge: Pledge }) {
  const sections = (pledge.detailSections ?? []).filter(
    (section) => section.items.length > 0 || section.looseLines.length > 0
  );

  if (sections.length === 0) {
    return (
      <ul className="pledge-raw-lines">
        {pledge.details.map((detail, detailIndex) => (
          <li key={`${detail}-${detailIndex}`}>{detail}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className="pledge-sections">
      {sections.map((section, sectionIndex) => (
        <section
          className="pledge-section"
          key={`${section.title}-${sectionIndex}`}
        >
          <h4>{section.title}</h4>
          {section.looseLines.length > 0 ? (
            <ul className="pledge-loose-lines">
              {section.looseLines.map((line, lineIndex) => (
                <li key={`${line}-${lineIndex}`}>{line}</li>
              ))}
            </ul>
          ) : null}
          {section.items.length > 0 ? (
            <ul className="pledge-section-items">
              {section.items.map((item, itemIndex) => (
                <li key={`${item.text}-${itemIndex}`}>
                  <p className="pledge-section-item-text">{item.text}</p>
                  {item.details.length > 0 ? (
                    <ul className="pledge-detail-lines">
                      {item.details.map((detail, detailIndex) => (
                        <li key={`${detail}-${detailIndex}`}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
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

      <CandidateMaterials materials={candidate.material.materials} />

      <section className="panel">
        <div className="panel-heading">
          <h2>주요 공약</h2>
          <span>{candidate.pledges.length.toLocaleString("ko-KR")}개</span>
        </div>
        <div className="pledge-list">
          {candidate.pledges.map((pledge) => {
            const preview = firstSectionText(pledge);

            return (
              <article className="pledge-item" key={pledge.id}>
                <span>{pledge.category}</span>
                <h3>{pledge.title}</h3>
                {preview ? <p>{preview}</p> : null}
                <details>
                  <summary>공약 원문 보기</summary>
                  <PledgeDetailContent pledge={pledge} />
                </details>
              </article>
            );
          })}
        </div>
      </section>

      <CandidateSourceInfo source={candidate.source} />
    </main>
  );
}
