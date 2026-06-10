import Link from "next/link";
import { notFound } from "next/navigation";

import { officeLabels } from "../../../lib/election-stats";
import { getElectionCandidateById } from "../../../lib/election-db";
import { candidateElectionBulletinViewerUrl } from "../../../lib/campaign-material-viewer";
import {
  criminalRecordClass,
  criminalRecordDetail,
  criminalRecordLabel
} from "../../../lib/candidate-disclosure";
import type { Pledge } from "../../../types/election";
import { CandidateMaterials } from "./CandidateMaterials";
import { CandidateSourceInfo } from "./CandidateSourceInfo";

export const dynamic = "force-dynamic";

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

  const electionBulletinUrl = candidateElectionBulletinViewerUrl(candidate);
  const criminalRecord = candidate.criminalRecord;

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
      </section>

      <section className="content-grid detail-basic-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>기본 정보</h2>
          </div>
          <dl className="info-list">
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
            <div>
              <dt>전과기록 공개자료</dt>
              <dd className="criminal-record-summary">
                <span
                  className={`criminal-record-chip ${criminalRecordClass(
                    criminalRecord
                  )}`}
                >
                  {criminalRecordLabel(criminalRecord)}
                </span>
                <span>{criminalRecordDetail(criminalRecord)}</span>
              </dd>
            </div>
            <div>
              <dt>자료 기준</dt>
              <dd>선거공보 후보자 정보 공개자료 PDF 텍스트 추출</dd>
            </div>
            <div>
              <dt>선거공보</dt>
              <dd>
                {electionBulletinUrl ? (
                  <a href={electionBulletinUrl} rel="noreferrer" target="_blank">
                    원문 PDF 보기
                  </a>
                ) : (
                  "원문 PDF 없음"
                )}
              </dd>
            </div>
          </dl>
          {criminalRecord?.excerpt ? (
            <details className="disclosure-excerpt">
              <summary>추출 구간 보기</summary>
              <p>{criminalRecord.excerpt}</p>
            </details>
          ) : null}
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
