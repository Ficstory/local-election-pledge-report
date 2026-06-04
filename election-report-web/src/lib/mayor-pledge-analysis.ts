import type { Candidate, Pledge } from "../types/election";

export type MayorPledgeFilter = {
  candidateId?: string;
  partyName?: string;
  query?: string;
  regionName?: string;
};

export type MayorPledgeItem = {
  id: string;
  candidateId: string;
  candidateName: string;
  partyName: string;
  regionName: string;
  districtName?: string;
  electionName: string;
  pledgeTitle: string;
  pledgeSummary: string;
  pledgeText: string;
  keywords: string[];
  keywordTokens?: string[];
  materialUrl?: string;
};

export type MayorKeyword = {
  keyword: string;
  count: number;
  pledgeCount: number;
  candidateCount: number;
};

export type CandidateKeywordSummary = {
  candidateId: string;
  candidateName: string;
  partyName: string;
  regionName: string;
  keywords: string[];
};

export type PolicyCategorySummary = {
  category: string;
  count: number;
  keywords: string[];
};

export type MayorPledgeAnalysis = {
  candidates: Candidate[];
  pledgeItems: MayorPledgeItem[];
  keywords: MayorKeyword[];
  candidateKeywords: CandidateKeywordSummary[];
  policyCategories: PolicyCategorySummary[];
};

export type MayorPledgeClientAnalysis = Pick<
  MayorPledgeAnalysis,
  "candidateKeywords" | "keywords" | "pledgeItems" | "policyCategories"
>;

export const MAYOR_CLIENT_KEYWORD_LIMIT = 34;
export const MAYOR_CLIENT_PLEDGE_TEXT_LIMIT = 170;

export const commonKeywordStopwords = [
  "추진",
  "확대",
  "지원",
  "강화",
  "조성",
  "구축",
  "개선",
  "제공",
  "시민",
  "지역",
  "공약",
  "정책",
  "사업",
  "계획",
  "관련",
  "중심",
  "기반",
  "활성화",
  "마련",
  "운영",
  "실현",
  "위해",
  "통한",
  "대한",
  "등",
  "및"
];

export const mayorKeywordStopwords = [
  "도시",
  "시정",
  "시장",
  "주민",
  "우리",
  "행복",
  "미래",
  "함께"
];

export const policyCategoryRules = [
  {
    category: "교통",
    keywords: ["지하철", "버스", "도로", "주차", "교통", "환승", "보행"]
  },
  {
    category: "주거/도시개발",
    keywords: ["주택", "재개발", "재건축", "정비", "공공임대", "주거", "개발"]
  },
  {
    category: "복지",
    keywords: ["복지", "어르신", "장애인", "돌봄", "지원금", "보건"]
  },
  {
    category: "경제/일자리",
    keywords: ["일자리", "창업", "소상공인", "기업", "산업", "상권"]
  },
  {
    category: "교육/돌봄",
    keywords: ["교육", "학교", "돌봄", "청소년", "아동", "보육"]
  },
  {
    category: "환경",
    keywords: ["환경", "탄소", "녹지", "공원", "에너지", "폐기물"]
  },
  {
    category: "안전",
    keywords: ["안전", "재난", "방범", "CCTV", "침수", "치안"]
  },
  {
    category: "문화/관광",
    keywords: ["문화", "관광", "축제", "예술", "체육", "해양"]
  },
  {
    category: "행정/재정",
    keywords: ["행정", "재정", "예산", "민원", "공공데이터", "참여"]
  }
];

const koreanParticles = [
  "에게서",
  "으로써",
  "으로서",
  "에게",
  "까지",
  "부터",
  "보다",
  "처럼",
  "으로",
  "라고",
  "과",
  "와",
  "을",
  "를",
  "은",
  "는",
  "이",
  "가",
  "의",
  "에",
  "로",
  "도",
  "만"
];

function candidateLocation(candidate: Candidate) {
  return candidate.districtName
    ? `${candidate.regionName} ${candidate.districtName}`
    : candidate.regionName;
}

function candidateMaterialUrl(candidate: Candidate) {
  return (
    candidate.material.pdfUrl ??
    candidate.material.materials?.find((material) => material.sourceUrl)?.sourceUrl
  );
}

function matchesLegacyMayorOfficeName(candidate: Candidate) {
  const isLocalExecutive =
    candidate.officeType === "governor" || candidate.officeType === "municipal_mayor";

  return (
    isLocalExecutive &&
    candidate.officeName.includes("시장") &&
    !candidate.officeName.includes("구청장") &&
    !candidate.officeName.includes("군수")
  );
}

export function isMayorCandidate(candidate: Candidate) {
  const officeName = candidate.officeName.normalize("NFKC");
  const districtName = candidate.districtName?.normalize("NFKC").trim();
  const regionName = candidate.regionName.normalize("NFKC").trim();
  const citySuffix = "\uC2DC";
  const districtSuffix = "\uAD6C";
  const countySuffix = "\uAD70";
  const mayorText = "\uC2DC\uC7A5";
  const districtHeadText = "\uAD6C\uCCAD\uC7A5";
  const countyHeadText = "\uAD70\uC218";

  if (candidate.officeType === "governor") {
    return matchesLegacyMayorOfficeName(candidate) || regionName.endsWith(citySuffix);
  }

  if (candidate.officeType !== "municipal_mayor") {
    return false;
  }

  if (
    officeName.includes(districtHeadText) ||
    officeName.includes(countyHeadText) ||
    districtName?.endsWith(districtSuffix) ||
    districtName?.endsWith(countySuffix)
  ) {
    return false;
  }

  return (
    matchesLegacyMayorOfficeName(candidate) ||
    officeName.includes(mayorText) ||
    Boolean(districtName?.endsWith(citySuffix))
  );
}

function pledgeText(pledge: Pledge) {
  const details = pledge.details.join(" ");
  return [pledge.title, pledge.summary, details].filter(Boolean).join(" ");
}

function includesQuery(pledge: Pledge, query: string | undefined) {
  const normalizedQuery = query?.trim().toLocaleLowerCase("ko-KR");

  if (!normalizedQuery) {
    return true;
  }

  return pledgeText(pledge).toLocaleLowerCase("ko-KR").includes(normalizedQuery);
}

export function normalizeKoreanKeyword(token: string) {
  const compactToken = token
    .normalize("NFKC")
    .replace(/^[^0-9A-Za-z가-힣]+|[^0-9A-Za-z가-힣]+$/g, "")
    .toLocaleLowerCase("ko-KR");

  if (!compactToken) {
    return "";
  }

  const withoutParticle = koreanParticles.reduce((current, particle) => {
    if (current.length <= particle.length + 1) {
      return current;
    }

    return current.endsWith(particle)
      ? current.slice(0, -particle.length)
      : current;
  }, compactToken);

  return withoutParticle.replace(/(하겠습니다|합니다|한다|하기|적인|적으로)$/g, "");
}

export function createKeywordStopwordSet(extraStopwords: Iterable<string> = []) {
  const stopwordCandidates = [
    ...commonKeywordStopwords,
    ...mayorKeywordStopwords,
    ...extraStopwords
  ];

  return new Set(
    stopwordCandidates
      .flatMap((stopword) => [stopword, ...stopword.split(/\s+/)])
      .map(normalizeKoreanKeyword)
      .filter(Boolean)
  );
}

export function tokenizePledgeText(
  text: string,
  extraStopwords: Iterable<string> | ReadonlySet<string> = []
): string[] {
  const stopwords =
    extraStopwords instanceof Set
      ? extraStopwords
      : createKeywordStopwordSet(extraStopwords);

  return text
    .replace(/[^\dA-Za-z가-힣]+/g, " ")
    .split(/\s+/)
    .map(normalizeKoreanKeyword)
    .filter((token) => {
      if (token.length < 2) {
        return false;
      }

      if (/^\d+$/.test(token)) {
        return false;
      }

      return !stopwords.has(token);
    });
}

function candidateStopwords(candidates: Candidate[]) {
  return candidates.flatMap((candidate) => [
    candidate.candidateName,
    candidate.partyName,
    candidate.regionName,
    candidate.districtName ?? "",
    candidate.officeName,
    candidate.electionName
  ]);
}

function buildPledgeItems(
  candidates: Candidate[],
  query: string | undefined,
  stopwords: ReadonlySet<string>
) {
  return candidates.flatMap((candidate) =>
    candidate.pledges
      .filter((pledge) => includesQuery(pledge, query))
      .map((pledge) => {
        const text = pledgeText(pledge);
        const keywordTokens = tokenizePledgeText(text, stopwords);

        return {
          id: pledge.id,
          candidateId: candidate.id,
          candidateName: candidate.candidateName,
          partyName: candidate.partyName,
          regionName: candidateLocation(candidate),
          districtName: candidate.districtName,
          electionName: candidate.officeName,
          pledgeTitle: pledge.title,
          pledgeSummary: pledge.summary,
          pledgeText: text,
          keywords: [...new Set(keywordTokens)],
          keywordTokens,
          materialUrl: candidateMaterialUrl(candidate)
        } satisfies MayorPledgeItem;
      })
  );
}

function keywordStats(pledgeItems: MayorPledgeItem[]) {
  const stats = new Map<
    string,
    {
      count: number;
      pledgeIds: Set<string>;
      candidateIds: Set<string>;
    }
  >();

  for (const pledge of pledgeItems) {
    const pledgeKeywords = new Set<string>();

    for (const token of pledge.keywordTokens ?? pledge.keywords) {
      const current =
        stats.get(token) ??
        {
          count: 0,
          pledgeIds: new Set<string>(),
          candidateIds: new Set<string>()
        };

      current.count += 1;
      current.pledgeIds.add(pledge.id);
      current.candidateIds.add(pledge.candidateId);
      stats.set(token, current);
      pledgeKeywords.add(token);
    }
  }

  return [...stats.entries()]
    .map(([keyword, value]) => ({
      keyword,
      count: value.count,
      pledgeCount: value.pledgeIds.size,
      candidateCount: value.candidateIds.size
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        right.pledgeCount - left.pledgeCount ||
        left.keyword.localeCompare(right.keyword, "ko")
    );
}

function filterMayorCandidates(
  candidates: Candidate[],
  filters: MayorPledgeFilter,
  includeCandidate: (candidate: Candidate) => boolean = isMayorCandidate
) {
  return candidates.filter((candidate) => {
    if (!includeCandidate(candidate)) {
      return false;
    }

    if (filters.regionName && candidate.regionName !== filters.regionName) {
      return false;
    }

    if (filters.partyName && candidate.partyName !== filters.partyName) {
      return false;
    }

    if (filters.candidateId && candidate.id !== filters.candidateId) {
      return false;
    }

    return true;
  });
}

function buildCandidateKeywordSummaries(
  candidates: Candidate[],
  pledgeItems: MayorPledgeItem[]
) {
  const pledgeItemsByCandidate = pledgeItems.reduce<Record<string, MayorPledgeItem[]>>(
    (groups, pledge) => {
      groups[pledge.candidateId] = groups[pledge.candidateId] ?? [];
      groups[pledge.candidateId].push(pledge);
      return groups;
    },
    {}
  );

  return candidates
    .map((candidate) => {
      const candidatePledges = pledgeItemsByCandidate[candidate.id] ?? [];
      const keywords = keywordStats(candidatePledges)
        .slice(0, 5)
        .map((keyword) => keyword.keyword);

      return {
        candidateId: candidate.id,
        candidateName: candidate.candidateName,
        partyName: candidate.partyName,
        regionName: candidateLocation(candidate),
        keywords
      };
    })
    .filter((candidate) => candidate.keywords.length > 0);
}

export function classifyPolicyCategories(keywords: MayorKeyword[]) {
  const normalizedRules = policyCategoryRules.map((rule) => ({
    category: rule.category,
    keywords: rule.keywords.map(normalizeKoreanKeyword)
  }));

  return normalizedRules
    .map((rule) => {
      const matchedKeywords = keywords.filter((keyword) =>
        rule.keywords.some((ruleKeyword) => keyword.keyword.includes(ruleKeyword))
      );

      return {
        category: rule.category,
        count: matchedKeywords.reduce((sum, keyword) => sum + keyword.count, 0),
        keywords: matchedKeywords.slice(0, 4).map((keyword) => keyword.keyword)
      };
    })
    .filter((category) => category.count > 0)
    .sort((left, right) => right.count - left.count);
}

export function analyzeMayorPledges(
  candidates: Candidate[],
  filters: MayorPledgeFilter,
  includeCandidate?: (candidate: Candidate) => boolean
): MayorPledgeAnalysis {
  const filteredCandidates = filterMayorCandidates(
    candidates,
    filters,
    includeCandidate
  );
  const stopwords = createKeywordStopwordSet(candidateStopwords(filteredCandidates));
  const pledgeItems = buildPledgeItems(filteredCandidates, filters.query, stopwords);
  const keywords = keywordStats(pledgeItems);

  return {
    candidates: filteredCandidates,
    pledgeItems,
    keywords,
    candidateKeywords: buildCandidateKeywordSummaries(
      filteredCandidates,
      pledgeItems
    ),
    policyCategories: classifyPolicyCategories(keywords)
  };
}

function compactPledgeText(text: string) {
  return text.length > MAYOR_CLIENT_PLEDGE_TEXT_LIMIT
    ? `${text.slice(0, MAYOR_CLIENT_PLEDGE_TEXT_LIMIT)}...`
    : text;
}

export function prepareMayorPledgeClientAnalysis(
  analysis: MayorPledgeClientAnalysis
): MayorPledgeClientAnalysis {
  const keywords = analysis.keywords.slice(0, MAYOR_CLIENT_KEYWORD_LIMIT);
  const selectableKeywords = new Set([
    ...keywords.map((keyword) => keyword.keyword),
    ...analysis.candidateKeywords.flatMap((candidate) => candidate.keywords)
  ]);

  return {
    candidateKeywords: analysis.candidateKeywords,
    keywords,
    pledgeItems: analysis.pledgeItems.map((pledge) => {
      const compactedPledge = {
        ...pledge,
        keywords: pledge.keywords.filter((keyword) => selectableKeywords.has(keyword)),
        pledgeText: compactPledgeText(pledge.pledgeText)
      };

      delete compactedPledge.keywordTokens;
      return compactedPledge;
    }),
    policyCategories: analysis.policyCategories
  };
}
