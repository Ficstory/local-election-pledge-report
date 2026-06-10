import type { CandidateCampaignMaterial } from "../../../types/election";
import { campaignMaterialViewerUrl } from "../../../lib/campaign-material-viewer";

type CandidateMaterialsProps = {
  materials?: CandidateCampaignMaterial[];
};

const materialTypeLabels: Record<string, string> = {
  ELECTION_BULLETIN: "선거공보",
  PLEDGE_DOCUMENT: "선거공약서",
  TOP_FIVE_PLEDGES: "5대공약"
};

function materialTitle(material: CandidateCampaignMaterial) {
  return materialTypeLabels[material.materialType] ?? material.title ?? "선거자료";
}

export function CandidateMaterials({ materials = [] }: CandidateMaterialsProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>선거자료</h2>
        <span>{materials.length.toLocaleString("ko-KR")}개</span>
      </div>
      {materials.length > 0 ? (
        <div className="material-link-list">
          {materials.map((material) => {
            const viewerUrl = campaignMaterialViewerUrl(material);

            return (
              <article className="material-link-item" key={material.id}>
                <div>
                  <strong>{materialTitle(material)}</strong>
                  <span>PDF 자료</span>
                </div>
                {viewerUrl ? (
                  <a
                    className="action-button secondary"
                    href={viewerUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    원문 보기
                  </a>
                ) : (
                  <div className="action-button disabled">자료 준비 중</div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-copy">공개된 선거자료가 없습니다.</p>
      )}
    </section>
  );
}
