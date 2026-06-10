import type { Candidate, Pledge } from "../types/election";
import {
  candidateElectionBulletinViewerUrl,
  candidateTopFivePledgeViewerUrl
} from "./campaign-material-viewer.ts";

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
  phraseTokens?: string[];
  electionBulletinUrl?: string;
  materialUrl?: string;
};

export type MayorKeyword = {
  keyword: string;
  count: number;
  pledgeCount: number;
  candidateCount: number;
  candidateRate?: number;
  score?: number;
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

export const pledgeTemplateStopwords = [
  "공약",
  "공약명",
  "공약순위",
  "분야",
  "목표",
  "제목",
  "개요",
  "현황",
  "문제점",
  "개선방안",
  "세부내용",
  "추진계획",
  "추진일정",
  "추진",
  "계획",
  "이행",
  "이행기간",
  "이행방법",
  "임기",
  "임기내",
  "임기후",
  "재원",
  "조달",
  "방안",
  "재원조달",
  "재원조달방안",
  "기간",
  "소요예산",
  "사업비",
  "예산",
  "국비",
  "도비",
  "시비",
  "군비",
  "구비",
  "민자",
  "기대효과",
  "기타",
  "해당없음",
  "없음",
  "민선",
  "취임",
  "즉시",
  "상반기",
  "하반기",
  "기본계획",
  "수립",
  "조례",
  "제정",
  "단기",
  "중기",
  "장기",
  "단계적",
  "준비하여",
  "재정사업",
  "재정",
  "적극",
  "확보",
  "타당성",
  "조사",
  "관계기관",
  "협의",
  "연계",
  "통해",
  "경우",
  "기존",
  "또는",
  "모니터링",
  "행정지원",
  "편성",
  "활용",
  "개정",
  "시행",
  "직후",
  "당선",
  "전국",
  "최초",
  "검토",
  "완료",
  "계속",
  "신규",
  "goal",
  "execution",
  "period",
  "method",
  "budget",
  "funding",
  "plan"
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
  return candidateTopFivePledgeViewerUrl(candidate);
}

function candidateElectionBulletinUrl(candidate: Candidate) {
  return candidateElectionBulletinViewerUrl(candidate);
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
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
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
    ...pledgeTemplateStopwords,
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
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map(normalizeKoreanKeyword)
    .filter((token) => {
      if (token.length < 2) {
        return false;
      }

      if (/^\d+$/.test(token)) {
        return false;
      }

      if (/^\d{2,4}년$|^\d{1,2}월$|^\d+기$/.test(token)) {
        return false;
      }

      if (/\d/.test(token) && !/^(1인가구|2차전지|4차산업|5g)$/i.test(token)) {
        return false;
      }

      return !stopwords.has(token);
    });
}

function phraseTokenLength(token: string) {
  return [...token].length;
}

function hasEnoughPolicySignal(tokens: string[]) {
  return tokens.some((token) => phraseTokenLength(token) >= 2);
}

export function extractPolicyPhrasesFromTokens(tokens: string[]) {
  const phrases: string[] = [];

  for (let size = 2; size <= 4; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const phraseTokens = tokens.slice(index, index + size);
      const uniqueTokenCount = new Set(phraseTokens).size;

      if (!hasEnoughPolicySignal(phraseTokens)) {
        continue;
      }

      if (uniqueTokenCount === 1) {
        continue;
      }

      if (size >= 3 && uniqueTokenCount < size) {
        continue;
      }

      phrases.push(phraseTokens.join(" "));
    }
  }

  return [...new Set(phrases)];
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
        const phraseTokens = extractPolicyPhrasesFromTokens(keywordTokens);

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
          keywords: [...new Set([...phraseTokens, ...keywordTokens])],
          keywordTokens,
          phraseTokens,
          electionBulletinUrl: candidateElectionBulletinUrl(candidate),
          materialUrl: candidateMaterialUrl(candidate)
        } satisfies MayorPledgeItem;
      })
  );
}

function tokenSourceFor(
  pledge: MayorPledgeItem,
  tokenSource: "keywordTokens" | "phraseTokens" | "keywords"
) {
  switch (tokenSource) {
    case "phraseTokens":
      return pledge.phraseTokens ?? [];
    case "keywords":
      return pledge.keywords;
    case "keywordTokens":
    default:
      return pledge.keywordTokens ?? pledge.keywords;
  }
}

export function summarizeMayorKeywordStats(
  pledgeItems: MayorPledgeItem[],
  options: {
    scoringCandidateCount?: number;
    tokenSource?: "keywordTokens" | "phraseTokens" | "keywords";
  } = {}
) {
  const stats = new Map<
    string,
    {
      count: number;
      pledgeIds: Set<string>;
      candidateIds: Set<string>;
    }
  >();
  const tokenSource = options.tokenSource ?? "keywordTokens";
  const totalCandidateCount =
    options.scoringCandidateCount ??
    new Set(pledgeItems.map((pledge) => pledge.candidateId)).size;

  for (const pledge of pledgeItems) {
    const pledgeKeywords = new Set<string>();

    for (const token of tokenSourceFor(pledge, tokenSource)) {
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

  const entries = [...stats.entries()].filter(([, value]) => {
    if (tokenSource !== "phraseTokens" || totalCandidateCount <= 20) {
      return true;
    }

    return value.count >= 2 || value.candidateIds.size >= 2;
  });

  return entries
    .map(([keyword, value]) => {
      const candidateCount = value.candidateIds.size;
      const candidateRate =
        totalCandidateCount > 0 ? candidateCount / totalCandidateCount : 0;
      const idf = Math.log((totalCandidateCount + 1) / (candidateCount + 1)) + 1;
      const phraseLength = keyword.split(/\s+/).length;
      const phraseLengthWeight =
        tokenSource === "phraseTokens"
          ? phraseLength === 2
            ? 1.15
            : phraseLength === 3
              ? 1
              : 0.85
          : 1;
      const score =
        Math.log1p(value.count) *
        idf *
        (0.5 + Math.min(candidateRate, 0.4)) *
        phraseLengthWeight;

      return {
        keyword,
        candidateCount,
        candidateRate: Number(candidateRate.toFixed(4)),
        count: value.count,
        pledgeCount: value.pledgeIds.size,
        score: Number(score.toFixed(4))
      };
    })
    .sort(
      (left, right) =>
        (right.score ?? 0) - (left.score ?? 0) ||
        right.count - left.count ||
        right.pledgeCount - left.pledgeCount ||
        left.keyword.localeCompare(right.keyword, "ko")
    );
}

export function summarizeMayorPhraseStats(
  pledgeItems: MayorPledgeItem[],
  scoringCandidateCount?: number
) {
  return summarizeMayorKeywordStats(pledgeItems, {
    scoringCandidateCount,
    tokenSource: "phraseTokens"
  });
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
      const phraseKeywords = summarizeMayorPhraseStats(candidatePledges, 1)
        .slice(0, 5)
        .map((keyword) => keyword.keyword);
      const fallbackKeywords = summarizeMayorKeywordStats(candidatePledges)
        .slice(0, 5)
        .map((keyword) => keyword.keyword);

      return {
        candidateId: candidate.id,
        candidateName: candidate.candidateName,
        partyName: candidate.partyName,
        regionName: candidateLocation(candidate),
        keywords: phraseKeywords.length > 0 ? phraseKeywords : fallbackKeywords
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
  const phraseKeywords = summarizeMayorPhraseStats(
    pledgeItems,
    filteredCandidates.length
  );
  const keywords =
    phraseKeywords.length > 0
      ? phraseKeywords
      : summarizeMayorKeywordStats(pledgeItems, {
          scoringCandidateCount: filteredCandidates.length
        });

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

export function compareKeywordsByPledgeCount(
  left: MayorKeyword,
  right: MayorKeyword
) {
  return (
    right.pledgeCount - left.pledgeCount ||
    right.count - left.count ||
    right.candidateCount - left.candidateCount ||
    left.keyword.localeCompare(right.keyword, "ko")
  );
}

export function prepareMayorPledgeClientAnalysis(
  analysis: MayorPledgeClientAnalysis
): MayorPledgeClientAnalysis {
  const keywords = [...analysis.keywords]
    .sort(compareKeywordsByPledgeCount)
    .slice(0, MAYOR_CLIENT_KEYWORD_LIMIT);
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
      delete compactedPledge.phraseTokens;
      return compactedPledge;
    }),
    policyCategories: analysis.policyCategories
  };
}
