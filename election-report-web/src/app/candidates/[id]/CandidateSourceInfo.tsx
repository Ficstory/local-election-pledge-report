import type { Candidate } from "../../../types/election";

type CandidateSourceInfoProps = {
  source: Candidate["source"];
};

function checkedDate(fetchedAt: string | undefined) {
  const datePart = fetchedAt?.split("T")[0];

  return datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : "확인 전";
}

export function CandidateSourceInfo({ source }: CandidateSourceInfoProps) {
  return (
    <section className="panel source-panel">
      <div className="panel-heading">
        <h2>자료 출처</h2>
      </div>
      <dl className="info-list compact">
        <div>
          <dt>제공 기관</dt>
          <dd>중앙선거관리위원회</dd>
        </div>
        <div>
          <dt>최종 확인</dt>
          <dd>{checkedDate(source.fetchedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
