import type { Candidate } from "../types/election.ts";
import {
  analyzeMayorPledges,
  classifyPolicyCategories,
  selectRepresentativeKeywords,
  summarizeMayorKeywordStats,
  summarizeMayorPhraseStats,
  type MayorKeyword,
  type MayorPledgeItem,
  type PolicyCategorySummary
} from "./mayor-pledge-analysis.ts";

export const EXECUTIVE_PLEDGE_ANALYSIS_ELECTION_ID = "20260603";
export const EXECUTIVE_PLEDGE_ANALYSIS_OUTPUT_DIR =
  "storage/analysis/20260603/executive-pledges";
export const EXECUTIVE_SG_TYPECODES = ["3", "4"] as const;

export type ExecutiveSgTypecode = (typeof EXECUTIVE_SG_TYPECODES)[number];

export type ExecutiveCandidateResult = {
  elected: boolean | null;
  rank?: number | null;
  voteCount?: number | null;
  voteRate?: number | null;
};

export type ExecutivePledgeCandidate = Candidate & {
  electionResult?: ExecutiveCandidateResult;
  sgTypecode: string;
};

export type ExecutiveKeywordFrequencyRow = {
  candidateCount: number;
  count: number;
  electedCandidateCount: number;
  electedCount: number;
  electedPledgeCount: number;
  keyword: string;
  nonElectedCandidateCount: number;
  nonElectedCount: number;
  nonElectedPledgeCount: number;
  pledgeCount: number;
  candidateRate: number;
  countPerCandidate: number;
  score: number;
};

export type ExecutiveElectedKeywordComparisonRow = {
  electedCandidateCount: number;
  electedCount: number;
  electedCountPerCandidate: number;
  electedPledgeCount: number;
  keyword: string;
  moreObservedIn: "elected" | "non-elected" | "same";
  nonElectedCandidateCount: number;
  nonElectedCount: number;
  nonElectedCountPerCandidate: number;
  nonElectedPledgeCount: number;
  perCandidateDifference: number;
  totalCandidateCount: number;
  totalCount: number;
  totalPledgeCount: number;
};

export type ExecutivePolicyCategorySummaryRow = {
  category: string;
  count: number;
  electedCount: number;
  electedKeywords: string[];
  nonElectedCount: number;
  nonElectedKeywords: string[];
  topKeywords: string[];
};

export type ExecutiveCandidateKeywordSummaryRow = {
  candidateId: string;
  candidateName: string;
  districtName: string;
  elected: boolean;
  electionName: string;
  officeName: string;
  partyName: string;
  pledgeCount: number;
  rank: number | null;
  regionName: string;
  resultStatus: "elected" | "non-elected" | "missing-result";
  sgTypecode: ExecutiveSgTypecode;
  topKeywords: string[];
  voteCount: number | null;
  voteRate: number | null;
};

export type ExecutivePledgeAnalysisSummary = {
  analysisCriteria: {
    electionId: string;
    includedSgTypecodes: Array<{
      label: string;
      sgTypecode: ExecutiveSgTypecode;
    }>;
    policyMaterialScope: string;
    resultJoin: string;
    tokenization: string;
  };
  counts: {
    bySgTypecode: Record<
      ExecutiveSgTypecode,
      {
        candidateCount: number;
        electedCandidateCount: number;
        label: string;
        nonElectedCandidateCount: number;
        pledgeCount: number;
      }
    >;
    candidateCount: number;
    candidatesWithResultCount: number;
    electedCandidateCount: number;
    keywordCount: number;
    missingResultCandidateCount: number;
    nonElectedCandidateCount: number;
    phraseCount: number;
    pledgeCount: number;
  };
  generatedAt: string;
  limitations: string[];
  outputs: {
    candidateKeywordSummaryCsv: string;
    electedVsNonElectedKeywordsCsv: string;
    keywordFrequencyCsv: string;
    phraseFrequencyCsv: string;
    policyCategorySummaryCsv: string;
    summaryJson: string;
  };
  source: {
    electionResultTable: string;
    pledgeText: string;
  };
  topElectedObservedKeywords: ExecutiveElectedKeywordComparisonRow[];
  topKeywords: MayorKeyword[];
  topNonElectedObservedKeywords: ExecutiveElectedKeywordComparisonRow[];
};

export type ExecutivePledgeAnalysisResult = {
  candidateKeywordSummaryRows: ExecutiveCandidateKeywordSummaryRow[];
  electedVsNonElectedKeywordRows: ExecutiveElectedKeywordComparisonRow[];
  keywordFrequencyRows: ExecutiveKeywordFrequencyRow[];
  phraseFrequencyRows: ExecutiveKeywordFrequencyRow[];
  policyCategorySummaryRows: ExecutivePolicyCategorySummaryRow[];
  summary: ExecutivePledgeAnalysisSummary;
};

export type ExecutivePledgeAnalysisSerialized = {
  candidateKeywordSummaryCsv: string;
  electedVsNonElectedKeywordsCsv: string;
  keywordFrequencyCsv: string;
  phraseFrequencyCsv: string;
  policyCategorySummaryCsv: string;
  summaryJson: string;
};

const SG_TYPECODE_LABELS: Record<ExecutiveSgTypecode, string> = {
  "3": "시·도지사",
  "4": "구·시·군의 장"
};
const EXECUTIVE_PHRASE_OUTPUT_LIMIT = 10000;

function isExecutiveSgTypecode(
  sgTypecode: string
): sgTypecode is ExecutiveSgTypecode {
  return EXECUTIVE_SG_TYPECODES.includes(sgTypecode as ExecutiveSgTypecode);
}

function resultStatus(candidate: ExecutivePledgeCandidate) {
  if (candidate.electionResult?.elected === true) {
    return "elected";
  }

  if (candidate.electionResult?.elected === false) {
    return "non-elected";
  }

  return "missing-result";
}

function keywordMap(keywords: MayorKeyword[]) {
  return new Map(keywords.map((keyword) => [keyword.keyword, keyword]));
}

function emptyKeyword(keyword: string): MayorKeyword {
  return {
    candidateCount: 0,
    count: 0,
    keyword,
    pledgeCount: 0
  };
}

function usefulPhraseKeywords(keywords: MayorKeyword[]) {
  return keywords.slice(0, EXECUTIVE_PHRASE_OUTPUT_LIMIT);
}

function round(value: number, digits = 4) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function countPerCandidate(count: number, candidateCount: number) {
  return candidateCount > 0 ? round(count / candidateCount) : 0;
}

function keywordsForCandidate(
  candidateId: string,
  pledgeItemsByCandidate: Map<string, MayorPledgeItem[]>
) {
  const candidatePledges = pledgeItemsByCandidate.get(candidateId) ?? [];
  const phrases = summarizeMayorPhraseStats(candidatePledges, 1)
    .slice(0, 8)
    .map((keyword) => keyword.keyword);

  if (phrases.length > 0) {
    return phrases;
  }

  return summarizeMayorKeywordStats(candidatePledges)
    .slice(0, 8)
    .map((keyword) => keyword.keyword);
}

function groupPledgeItems(
  candidates: ExecutivePledgeCandidate[],
  pledgeItems: MayorPledgeItem[]
) {
  const electedCandidateIds = new Set(
    candidates
      .filter((candidate) => candidate.electionResult?.elected === true)
      .map((candidate) => candidate.id)
  );
  const nonElectedCandidateIds = new Set(
    candidates
      .filter((candidate) => candidate.electionResult?.elected === false)
      .map((candidate) => candidate.id)
  );

  return {
    elected: pledgeItems.filter((pledge) =>
      electedCandidateIds.has(pledge.candidateId)
    ),
    nonElected: pledgeItems.filter((pledge) =>
      nonElectedCandidateIds.has(pledge.candidateId)
    )
  };
}

function buildKeywordFrequencyRows({
  candidateCount,
  electedKeywords,
  nonElectedKeywords,
  overallKeywords
}: {
  candidateCount: number;
  electedKeywords: MayorKeyword[];
  nonElectedKeywords: MayorKeyword[];
  overallKeywords: MayorKeyword[];
}): ExecutiveKeywordFrequencyRow[] {
  const electedByKeyword = keywordMap(electedKeywords);
  const nonElectedByKeyword = keywordMap(nonElectedKeywords);

  return overallKeywords.map((keyword) => {
    const elected = electedByKeyword.get(keyword.keyword) ?? emptyKeyword(keyword.keyword);
    const nonElected =
      nonElectedByKeyword.get(keyword.keyword) ?? emptyKeyword(keyword.keyword);

    return {
      candidateCount: keyword.candidateCount,
      candidateRate:
        keyword.candidateRate ??
        (candidateCount > 0 ? round(keyword.candidateCount / candidateCount) : 0),
      count: keyword.count,
      countPerCandidate: countPerCandidate(keyword.count, candidateCount),
      electedCandidateCount: elected.candidateCount,
      electedCount: elected.count,
      electedPledgeCount: elected.pledgeCount,
      keyword: keyword.keyword,
      nonElectedCandidateCount: nonElected.candidateCount,
      nonElectedCount: nonElected.count,
      nonElectedPledgeCount: nonElected.pledgeCount,
      pledgeCount: keyword.pledgeCount,
      score: keyword.score ?? 0
    };
  });
}

function buildElectedKeywordComparisonRows({
  electedCandidateCount,
  electedKeywords,
  nonElectedCandidateCount,
  nonElectedKeywords,
  overallKeywords
}: {
  electedCandidateCount: number;
  electedKeywords: MayorKeyword[];
  nonElectedCandidateCount: number;
  nonElectedKeywords: MayorKeyword[];
  overallKeywords: MayorKeyword[];
}): ExecutiveElectedKeywordComparisonRow[] {
  const electedByKeyword = keywordMap(electedKeywords);
  const nonElectedByKeyword = keywordMap(nonElectedKeywords);

  return overallKeywords
    .map((keyword) => {
      const elected =
        electedByKeyword.get(keyword.keyword) ?? emptyKeyword(keyword.keyword);
      const nonElected =
        nonElectedByKeyword.get(keyword.keyword) ?? emptyKeyword(keyword.keyword);
      const electedRate = countPerCandidate(
        elected.count,
        electedCandidateCount
      );
      const nonElectedRate = countPerCandidate(
        nonElected.count,
        nonElectedCandidateCount
      );
      const difference = round(electedRate - nonElectedRate);
      const moreObservedIn: ExecutiveElectedKeywordComparisonRow["moreObservedIn"] =
        difference > 0 ? "elected" : difference < 0 ? "non-elected" : "same";

      return {
        electedCandidateCount: elected.candidateCount,
        electedCount: elected.count,
        electedCountPerCandidate: electedRate,
        electedPledgeCount: elected.pledgeCount,
        keyword: keyword.keyword,
        moreObservedIn,
        nonElectedCandidateCount: nonElected.candidateCount,
        nonElectedCount: nonElected.count,
        nonElectedCountPerCandidate: nonElectedRate,
        nonElectedPledgeCount: nonElected.pledgeCount,
        perCandidateDifference: difference,
        totalCandidateCount: keyword.candidateCount,
        totalCount: keyword.count,
        totalPledgeCount: keyword.pledgeCount
      };
    })
    .sort(
      (left, right) =>
        Math.abs(right.perCandidateDifference) -
          Math.abs(left.perCandidateDifference) ||
        right.totalCount - left.totalCount ||
        left.keyword.localeCompare(right.keyword, "ko")
    );
}

function categoryMap(categories: PolicyCategorySummary[]) {
  return new Map(categories.map((category) => [category.category, category]));
}

function buildPolicyCategorySummaryRows({
  electedCategories,
  nonElectedCategories,
  overallCategories
}: {
  electedCategories: PolicyCategorySummary[];
  nonElectedCategories: PolicyCategorySummary[];
  overallCategories: PolicyCategorySummary[];
}): ExecutivePolicyCategorySummaryRow[] {
  const electedByCategory = categoryMap(electedCategories);
  const nonElectedByCategory = categoryMap(nonElectedCategories);
  const categoryNames = [
    ...new Set([
      ...overallCategories.map((category) => category.category),
      ...electedCategories.map((category) => category.category),
      ...nonElectedCategories.map((category) => category.category)
    ])
  ];

  return categoryNames
    .map((categoryName) => {
      const overall = overallCategories.find(
        (category) => category.category === categoryName
      );
      const elected = electedByCategory.get(categoryName);
      const nonElected = nonElectedByCategory.get(categoryName);

      return {
        category: categoryName,
        count: overall?.count ?? (elected?.count ?? 0) + (nonElected?.count ?? 0),
        electedCount: elected?.count ?? 0,
        electedKeywords: elected?.keywords ?? [],
        nonElectedCount: nonElected?.count ?? 0,
        nonElectedKeywords: nonElected?.keywords ?? [],
        topKeywords: overall?.keywords ?? []
      };
    })
    .sort(
      (left, right) =>
        right.count - left.count || left.category.localeCompare(right.category, "ko")
    );
}

function pledgeItemsByCandidate(pledgeItems: MayorPledgeItem[]) {
  return pledgeItems.reduce((groups, pledge) => {
    const group = groups.get(pledge.candidateId) ?? [];
    group.push(pledge);
    groups.set(pledge.candidateId, group);
    return groups;
  }, new Map<string, MayorPledgeItem[]>());
}

function buildCandidateKeywordSummaryRows(
  candidates: ExecutivePledgeCandidate[],
  pledgeItems: MayorPledgeItem[]
): ExecutiveCandidateKeywordSummaryRow[] {
  const groupedPledgeItems = pledgeItemsByCandidate(pledgeItems);

  return candidates.map((candidate) => ({
    candidateId: candidate.id,
    candidateName: candidate.candidateName,
    districtName: candidate.districtName ?? "",
    elected: candidate.electionResult?.elected === true,
    electionName: candidate.electionName,
    officeName: candidate.officeName,
    partyName: candidate.partyName,
    pledgeCount: groupedPledgeItems.get(candidate.id)?.length ?? 0,
    rank: candidate.electionResult?.rank ?? null,
    regionName: candidate.regionName,
    resultStatus: resultStatus(candidate),
    sgTypecode: candidate.sgTypecode as ExecutiveSgTypecode,
    topKeywords: keywordsForCandidate(candidate.id, groupedPledgeItems),
    voteCount: candidate.electionResult?.voteCount ?? null,
    voteRate: candidate.electionResult?.voteRate ?? null
  }));
}

function buildSgTypecodeSummary(
  candidates: ExecutivePledgeCandidate[],
  pledgeItems: MayorPledgeItem[]
) {
  return EXECUTIVE_SG_TYPECODES.reduce(
    (summary, sgTypecode) => {
      const groupCandidates = candidates.filter(
        (candidate) => candidate.sgTypecode === sgTypecode
      );
      const groupCandidateIds = new Set(
        groupCandidates.map((candidate) => candidate.id)
      );

      summary[sgTypecode] = {
        candidateCount: groupCandidates.length,
        electedCandidateCount: groupCandidates.filter(
          (candidate) => candidate.electionResult?.elected === true
        ).length,
        label: SG_TYPECODE_LABELS[sgTypecode],
        nonElectedCandidateCount: groupCandidates.filter(
          (candidate) => candidate.electionResult?.elected === false
        ).length,
        pledgeCount: pledgeItems.filter((pledge) =>
          groupCandidateIds.has(pledge.candidateId)
        ).length
      };

      return summary;
    },
    {} as ExecutivePledgeAnalysisSummary["counts"]["bySgTypecode"]
  );
}

function buildSummary({
  candidates,
  electedVsNonElectedKeywordRows,
  generatedAt,
  keywordFrequencyRows,
  phraseFrequencyRows,
  pledgeItems,
  pledgeCount
}: {
  candidates: ExecutivePledgeCandidate[];
  electedVsNonElectedKeywordRows: ExecutiveElectedKeywordComparisonRow[];
  generatedAt: string;
  keywordFrequencyRows: ExecutiveKeywordFrequencyRow[];
  phraseFrequencyRows: ExecutiveKeywordFrequencyRow[];
  pledgeItems: MayorPledgeItem[];
  pledgeCount: number;
}): ExecutivePledgeAnalysisSummary {
  return {
    analysisCriteria: {
      electionId: EXECUTIVE_PLEDGE_ANALYSIS_ELECTION_ID,
      includedSgTypecodes: EXECUTIVE_SG_TYPECODES.map((sgTypecode) => ({
        label: SG_TYPECODE_LABELS[sgTypecode],
        sgTypecode
      })),
      policyMaterialScope:
        "중앙선거관리위원회 OpenAPI 후보자 공약 텍스트의 제목, 요약, 상세 내용을 결합해 분석했습니다.",
      resultJoin:
        "Candidate.id와 ElectionResult.candidateId를 연결해 elected, voteCount, voteRate, rank를 반영했습니다.",
      tokenization:
        "형태소 분석이 아니라 NFKC 정규화, 공백/기호 분리, 후보·정당·지역명·공약 양식·일정/재원 양식 단어 제거를 적용한 토큰/규칙 기반 매칭입니다. 주요 분석 단위는 2~4어절 정책 구문이며, 빈도·후보 커버리지·TF-IDF 유사 점수를 함께 산출한 뒤 겹치는 구문 변형은 대표 구문으로 정리합니다."
    },
    counts: {
      bySgTypecode: buildSgTypecodeSummary(candidates, pledgeItems),
      candidateCount: candidates.length,
      candidatesWithResultCount: candidates.filter(
        (candidate) => candidate.electionResult?.elected != null
      ).length,
      electedCandidateCount: candidates.filter(
        (candidate) => candidate.electionResult?.elected === true
      ).length,
      keywordCount: keywordFrequencyRows.length,
      missingResultCandidateCount: candidates.filter(
        (candidate) =>
          !candidate.electionResult || candidate.electionResult.elected === null
      ).length,
      nonElectedCandidateCount: candidates.filter(
        (candidate) => candidate.electionResult?.elected === false
      ).length,
      phraseCount: phraseFrequencyRows.length,
      pledgeCount
    },
    generatedAt,
    limitations: [
      "원자료는 OpenAPI 공약 텍스트이며 PDF 디자인·시각 요소 분석은 포함하지 않았습니다.",
      "후보별 공약 수와 공약 상세 작성량이 달라 단순 빈도는 후보별 노출량 차이의 영향을 받습니다.",
      "키워드와 구문 매칭은 형태소 분석이 아닌 토큰/규칙 기반이므로 동의어, 문맥, 부정 표현을 완전히 해석하지 않습니다.",
      "정책 주제 사전 매핑은 보류했으므로 구문을 교통·복지·경제 같은 상위 주제로 강제 분류하지 않습니다.",
      "phrase-frequency.csv는 점수와 대표 구문 정리 기준을 적용해 겹치는 조합 구문의 노이즈를 줄였습니다.",
      "당선/낙선 비교는 당선 원인 해석이 아니라 관찰된 공약 텍스트 경향 비교입니다.",
      "득표 정보는 ElectionResult에 저장된 elected, voteCount, voteRate, rank 값을 그대로 연결했습니다.",
      "ElectionResult의 voteCount 또는 voteRate가 null인 후보는 CSV에서 빈 값으로 남깁니다."
    ],
    outputs: {
      candidateKeywordSummaryCsv: "candidate-keyword-summary.csv",
      electedVsNonElectedKeywordsCsv: "elected-vs-non-elected-keywords.csv",
      keywordFrequencyCsv: "keyword-frequency.csv",
      phraseFrequencyCsv: "phrase-frequency.csv",
      policyCategorySummaryCsv: "policy-category-summary.csv",
      summaryJson: "summary.json"
    },
    source: {
      electionResultTable: "ElectionResult",
      pledgeText: "NEC OpenAPI pledge title, summary, details"
    },
    topElectedObservedKeywords: electedVsNonElectedKeywordRows
      .filter((row) => row.moreObservedIn === "elected")
      .slice(0, 20),
    topKeywords: phraseFrequencyRows.slice(0, 30).map((row) => ({
      candidateCount: row.candidateCount,
      count: row.count,
      keyword: row.keyword,
      pledgeCount: row.pledgeCount,
      score: row.score
    })),
    topNonElectedObservedKeywords: electedVsNonElectedKeywordRows
      .filter((row) => row.moreObservedIn === "non-elected")
      .slice(0, 20)
  };
}

export function buildExecutivePledgeAnalysis(
  inputCandidates: ExecutivePledgeCandidate[],
  options: { generatedAt?: string } = {}
): ExecutivePledgeAnalysisResult {
  const candidates = inputCandidates.filter((candidate) =>
    isExecutiveSgTypecode(candidate.sgTypecode)
  );
  const analysis = analyzeMayorPledges(candidates, {}, (candidate) =>
    isExecutiveSgTypecode((candidate as ExecutivePledgeCandidate).sgTypecode)
  );
  const groupedPledges = groupPledgeItems(candidates, analysis.pledgeItems);
  const electedCandidateCount = candidates.filter(
    (candidate) => candidate.electionResult?.elected === true
  ).length;
  const nonElectedCandidateCount = candidates.filter(
    (candidate) => candidate.electionResult?.elected === false
  ).length;
  const wordKeywords = summarizeMayorKeywordStats(analysis.pledgeItems, {
    scoringCandidateCount: candidates.length
  });
  const phraseKeywords = usefulPhraseKeywords(
    selectRepresentativeKeywords(
      summarizeMayorPhraseStats(analysis.pledgeItems, candidates.length)
    )
  );
  const electedKeywords = summarizeMayorPhraseStats(
    groupedPledges.elected,
    electedCandidateCount
  );
  const nonElectedKeywords = summarizeMayorPhraseStats(
    groupedPledges.nonElected,
    nonElectedCandidateCount
  );
  const keywordFrequencyRows = buildKeywordFrequencyRows({
    candidateCount: candidates.length,
    electedKeywords: summarizeMayorKeywordStats(groupedPledges.elected, {
      scoringCandidateCount: electedCandidateCount
    }),
    nonElectedKeywords: summarizeMayorKeywordStats(groupedPledges.nonElected, {
      scoringCandidateCount: nonElectedCandidateCount
    }),
    overallKeywords: wordKeywords
  });
  const phraseFrequencyRows = buildKeywordFrequencyRows({
    candidateCount: candidates.length,
    electedKeywords,
    nonElectedKeywords,
    overallKeywords: phraseKeywords
  });
  const electedVsNonElectedKeywordRows = buildElectedKeywordComparisonRows({
    electedCandidateCount,
    electedKeywords,
    nonElectedCandidateCount,
    nonElectedKeywords,
    overallKeywords: phraseKeywords
  });
  const policyCategorySummaryRows = buildPolicyCategorySummaryRows({
    electedCategories: classifyPolicyCategories(electedKeywords),
    nonElectedCategories: classifyPolicyCategories(nonElectedKeywords),
    overallCategories: analysis.policyCategories
  });
  const candidateKeywordSummaryRows = buildCandidateKeywordSummaryRows(
    candidates,
    analysis.pledgeItems
  );
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const summary = buildSummary({
    candidates,
    electedVsNonElectedKeywordRows,
    generatedAt,
    keywordFrequencyRows,
    phraseFrequencyRows,
    pledgeCount: analysis.pledgeItems.length,
    pledgeItems: analysis.pledgeItems
  });

  return {
    candidateKeywordSummaryRows,
    electedVsNonElectedKeywordRows,
    keywordFrequencyRows,
    phraseFrequencyRows,
    policyCategorySummaryRows,
    summary
  };
}

type CsvValue = string | number | boolean | null | string[] | undefined;

function csvValue(value: CsvValue) {
  const text = Array.isArray(value)
    ? value.join("|")
    : value === null || value === undefined
      ? ""
      : String(value);

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv<T extends object>(
  headers: Array<keyof T>,
  rows: T[]
) {
  const lines = [
    headers.map((header) => csvValue(String(header))).join(","),
    ...rows.map((row) =>
      headers.map((header) => csvValue(row[header] as CsvValue)).join(",")
    )
  ];

  return `${lines.join("\n")}\n`;
}

export function serializeExecutivePledgeAnalysis(
  analysis: ExecutivePledgeAnalysisResult
): ExecutivePledgeAnalysisSerialized {
  return {
    candidateKeywordSummaryCsv: rowsToCsv<ExecutiveCandidateKeywordSummaryRow>(
      [
        "candidateId",
        "sgTypecode",
        "electionName",
        "officeName",
        "regionName",
        "districtName",
        "candidateName",
        "partyName",
        "resultStatus",
        "elected",
        "rank",
        "voteCount",
        "voteRate",
        "pledgeCount",
        "topKeywords"
      ],
      analysis.candidateKeywordSummaryRows
    ),
    electedVsNonElectedKeywordsCsv:
      rowsToCsv<ExecutiveElectedKeywordComparisonRow>(
        [
          "keyword",
          "totalCount",
          "totalPledgeCount",
          "totalCandidateCount",
          "electedCount",
          "electedPledgeCount",
          "electedCandidateCount",
          "electedCountPerCandidate",
          "nonElectedCount",
          "nonElectedPledgeCount",
          "nonElectedCandidateCount",
          "nonElectedCountPerCandidate",
          "perCandidateDifference",
          "moreObservedIn"
        ],
        analysis.electedVsNonElectedKeywordRows
      ),
    keywordFrequencyCsv: rowsToCsv<ExecutiveKeywordFrequencyRow>(
      [
        "keyword",
        "count",
        "pledgeCount",
        "candidateCount",
        "candidateRate",
        "countPerCandidate",
        "score",
        "electedCount",
        "electedPledgeCount",
        "electedCandidateCount",
        "nonElectedCount",
        "nonElectedPledgeCount",
        "nonElectedCandidateCount"
      ],
      analysis.keywordFrequencyRows
    ),
    phraseFrequencyCsv: rowsToCsv<ExecutiveKeywordFrequencyRow>(
      [
        "keyword",
        "count",
        "pledgeCount",
        "candidateCount",
        "candidateRate",
        "countPerCandidate",
        "score",
        "electedCount",
        "electedPledgeCount",
        "electedCandidateCount",
        "nonElectedCount",
        "nonElectedPledgeCount",
        "nonElectedCandidateCount"
      ],
      analysis.phraseFrequencyRows
    ),
    policyCategorySummaryCsv: rowsToCsv<ExecutivePolicyCategorySummaryRow>(
      [
        "category",
        "count",
        "electedCount",
        "nonElectedCount",
        "topKeywords",
        "electedKeywords",
        "nonElectedKeywords"
      ],
      analysis.policyCategorySummaryRows
    ),
    summaryJson: `${JSON.stringify(analysis.summary, null, 2)}\n`
  };
}
