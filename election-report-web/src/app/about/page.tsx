import Image from "next/image";
import type { Metadata } from "next";
import {
  BadgeCheck,
  ChartNoAxesColumnIncreasing,
  FileText,
  Landmark,
  MapPinned,
  Megaphone,
  MessageSquareText,
  Presentation,
  ShieldCheck,
  TrendingUp,
  Search,
  UserSearch,
  UsersRound
} from "lucide-react";

export const metadata: Metadata = {
  title: "프로젝트 소개 | 정치한번 읽어볼까",
  description:
    "공약과 선거 결과의 관계를 탐색하는 프로젝트 배경과 분석 관점을 소개합니다."
};

const electionFactors = [
  {
    Icon: UserSearch,
    description: "인지도와 도덕성",
    title: "후보자 요인"
  },
  {
    Icon: UsersRound,
    description: "정당 지지도",
    title: "정당 요인"
  },
  {
    Icon: Landmark,
    description: "현직 정부 평가",
    title: "정부 평가"
  },
  {
    Icon: MapPinned,
    description: "지역별 이슈",
    title: "지역 현안"
  },
  {
    Icon: MessageSquareText,
    description: "네거티브·노출",
    title: "미디어·이슈"
  }
];

const explorationItems = [
  {
    Icon: ChartNoAxesColumnIncreasing,
    description: "당선자 공약에서 반복적으로 등장하는 의제 탐색",
    title: "반복되는 정책 키워드"
  },
  {
    Icon: MapPinned,
    description: "지역별로 두드러지는 정책 이슈 비교",
    title: "지역별 주요 의제"
  },
  {
    Icon: TrendingUp,
    description: "최근 선거에서 강화되거나 약화된 트렌드 분석",
    title: "최근 정책 흐름"
  }
];

const insightSteps = [
  {
    Icon: UsersRound,
    title: "우리 지역에서 어떤 문제가 중요하게 다뤄졌는가?"
  },
  {
    Icon: Megaphone,
    title: "당선자들은 어떤 정책 언어로 유권자를 설득했는가?"
  },
  {
    Icon: TrendingUp,
    title: "지역별 정책 트렌드는 어디로 향하고 있는가?"
  }
];

function IconTile({
  description,
  Icon,
  title
}: {
  description: string;
  Icon: typeof Search;
  title: string;
}) {
  return (
    <article className="about-icon-tile">
      <span className="about-icon-disc" aria-hidden="true">
        <Icon size={34} strokeWidth={2.2} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-hero-copy">
          <h1 id="about-title">프로젝트 배경</h1>
          <p className="about-kicker">
            이 프로젝트는 어떤 문제의식에서 출발했고, 무엇을 탐색하려는가
          </p>
          <p>
            이 프로젝트는 “당선자들은 어떤 공약을 제시했고, 유권자들은 어떤
            공약을 내건 후보를 선택했는가”라는 질문에서 출발했습니다.
          </p>
          <p>
            공약만으로 당선 여부를 단정할 수는 없지만, 공약은 선거를 이해하는
            중요한 출발점입니다. 이 프로젝트는 공약과 당선의 관계를 단순한
            인과로 단정하지 않고, 어떤 방식으로 맞물려 있는지를 탐색합니다.
          </p>
        </div>

        <div className="about-hero-visual" aria-hidden="true">
          <Image
            className="about-hero-image"
            src="/about-hero-visual.png"
            alt=""
            width={530}
            height={316}
            priority
          />
        </div>
      </section>

      <section className="about-section about-start" aria-labelledby="about-start">
        <div className="about-section-lead">
          <span className="about-section-number">01</span>
          <h2 id="about-start">프로젝트의 출발점</h2>
          <p>이 프로젝트는 다음 질문에서 시작되었습니다.</p>
          <blockquote>
            당선자들은 어떤 공약을 제시했고, 유권자들은 어떤 공약을 내건 후보를
            선택했는가
          </blockquote>
        </div>
        <div className="about-card-grid two">
          <IconTile
            Icon={Presentation}
            description="당선된 후보가 어떤 정책 언어를 제시했는지 확인"
            title="당선자 공약 탐색"
          />
          <IconTile
            Icon={BadgeCheck}
            description="유권자가 어떤 공약을 본 뒤 후보를 선택했는지 이해"
            title="유권자 선택 이해"
          />
        </div>
      </section>

      <section className="about-section about-factor" aria-labelledby="about-factor">
        <div className="about-section-lead">
          <span className="about-section-number">02</span>
          <h2 id="about-factor">선거는 하나의 요인으로 설명되지 않습니다</h2>
          <p>
            선거 결과는 다양한 요인이 복합적으로 작용합니다. 공약은 그중 하나일
            뿐이며, 다른 요인들과 함께 이해해야 합니다.
          </p>
        </div>
        <div className="about-factor-grid">
          {electionFactors.map((factor) => (
            <IconTile key={factor.title} {...factor} />
          ))}
        </div>
      </section>

      <section className="about-section about-evidence" aria-labelledby="about-evidence">
        <div className="about-section-lead">
          <span className="about-section-number">03</span>
          <h2 id="about-evidence">그럼에도 공약이 중요한 이유</h2>
        </div>
        <div className="about-evidence-panel">
          <article className="about-metric-block">
            <div
              className="about-ring large"
              style={{
                background:
                  "conic-gradient(var(--primary) 0 63.2%, var(--color-blue-soft) 63.2% 100%)"
              }}
            >
              <span>63.2%</span>
            </div>
            <p>
              유권자의 <strong>63.2%</strong>가 정당의 정책이나 후보자의 공약을
              인지
            </p>
          </article>
          <article className="about-metric-block compact">
            <div
              className="about-ring"
              style={{
                background:
                  "conic-gradient(var(--primary) 0 20.6%, var(--color-blue-soft) 20.6% 100%)"
              }}
            >
              <span>20.6%</span>
            </div>
            <p>
              후보자 선택 정보 획득 경로로 선거벽보·공보 등 홍보물이 가장 높게
              응답
            </p>
          </article>
          <article className="about-evidence-note">
            <span className="about-icon-disc" aria-hidden="true">
              <FileText size={34} strokeWidth={2.2} />
            </span>
            <p>
              지방의원 및 비례대표 정당 선택 시 가장 많이 고려하는 요소로도
              <strong> 정책·공약</strong>이 꼽혔습니다.
            </p>
          </article>
          <p className="about-source">
            출처: 중앙선거관리위원회 2026년 제9회 전국동시지방선거 2차 유권자
            의식조사
          </p>
        </div>
      </section>

      <section className="about-section about-explore" aria-labelledby="about-explore">
        <div className="about-section-lead">
          <span className="about-section-number">04</span>
          <h2 id="about-explore">이 프로젝트가 탐색하는 것</h2>
          <p>
            공약 데이터를 다양한 관점에서 분석하여 공약과 선거 결과가 어떻게
            맞물려 있는지 탐색합니다.
          </p>
        </div>
        <div className="about-card-grid three">
          {explorationItems.map((item) => (
            <IconTile key={item.title} {...item} />
          ))}
        </div>
        <p className="about-callout">
          이 프로젝트는 공약과 당선 결과의 관계를 다양한 데이터와 시각화를 통해
          보여드리고자 합니다.
        </p>
      </section>

      <section className="about-section about-insight" aria-labelledby="about-insight">
        <div className="about-section-lead">
          <span className="about-section-number">05</span>
          <h2 id="about-insight">궁극적으로 제공하려는 인사이트</h2>
        </div>
        <div className="about-flow">
          {insightSteps.map((step, index) => (
            <article className="about-flow-card" key={step.title}>
              <span className="about-flow-index">{index + 1}</span>
              <span className="about-icon-disc" aria-hidden="true">
                <step.Icon size={32} strokeWidth={2.2} />
              </span>
              <h3>{step.title}</h3>
            </article>
          ))}
        </div>
        <p className="about-callout strong">
          선거 결과를 숫자로만 보는 데서 벗어나, 공약 기반 인사이트를 더 쉽게
          이해할 수 있도록 돕습니다.
        </p>
      </section>

      <section className="about-disclaimer" aria-label="프로젝트 중립성 안내">
        <ShieldCheck size={20} strokeWidth={2.2} aria-hidden="true" />
        <p>
          본 프로젝트는 중앙선거관리위원회 공개데이터를 기반으로 하며, 특정
          정당이나 후보를 지지하거나 반대하지 않습니다.
        </p>
      </section>
    </main>
  );
}
