import type { Candidate } from "../types/election";

export type EducationOrientationId = "progressive" | "conservative";
export type EducationOrientationBasis = "color" | "keyword" | "manual";
export type EducationOrientationConfidence = "high" | "medium" | "low";

type OrientationRule = {
  keyword: string;
  weight: number;
};

type PolicyAxisRule = {
  id: string;
  label: string;
  keywords: string[];
};

export type EducationOrientationEvidence = {
  keyword: string;
  count: number;
  score: number;
};

export type EducationPolicyAxis = {
  id: string;
  label: string;
  count: number;
  keywords: string[];
};

export type EducationColorOrientationEvidence = {
  blue: number;
  red: number;
};

export type EducationOrientationProfile = {
  basis: EducationOrientationBasis;
  colorEvidence?: EducationColorOrientationEvidence;
  confidence: EducationOrientationConfidence;
  conservativeScore: number;
  evidence: {
    conservative: EducationOrientationEvidence[];
    progressive: EducationOrientationEvidence[];
  };
  orientation: (typeof educationOrientationOptions)[number];
  policyAxes: EducationPolicyAxis[];
  progressiveScore: number;
};

export const educationOrientationOptions: Array<{
  id: EducationOrientationId;
  label: string;
  colorClass: string;
}> = [
  {
    id: "progressive",
    label: "진보성향 추정",
    colorClass: "orientation-progressive"
  },
  {
    id: "conservative",
    label: "보수성향 추정",
    colorClass: "orientation-conservative"
  }
];

const verifiedEducationColorOrientations: Record<
  string,
  EducationColorOrientationEvidence & { orientation: EducationOrientationId }
> = {
  "100153737": { orientation: "progressive", red: 26275, blue: 846802 },
  "100153739": { orientation: "progressive", red: 3438, blue: 746563 },
  "100153740": { orientation: "conservative", red: 238911, blue: 82960 },
  "100153741": { orientation: "progressive", red: 26709, blue: 388259 },
  "100153743": { orientation: "progressive", red: 5575, blue: 881516 },
  "100153751": { orientation: "progressive", red: 11363, blue: 241455 },
  "100153756": { orientation: "progressive", red: 4989, blue: 254255 },
  "100153758": { orientation: "progressive", red: 5163, blue: 791439 },
  "100153759": { orientation: "progressive", red: 3088, blue: 26880 },
  "100153760": { orientation: "progressive", red: 1068, blue: 242719 },
  "100153761": { orientation: "progressive", red: 2696, blue: 1056522 },
  "100153762": { orientation: "progressive", red: 27382, blue: 326748 },
  "100153763": { orientation: "progressive", red: 2578, blue: 391312 },
  "100153764": { orientation: "progressive", red: 9427, blue: 147208 },
  "100153770": { orientation: "progressive", red: 56484, blue: 304976 },
  "100153771": { orientation: "progressive", red: 9247, blue: 842554 },
  "100153774": { orientation: "conservative", red: 210514, blue: 7654 },
  "100153776": { orientation: "progressive", red: 3580, blue: 438960 },
  "100153778": { orientation: "progressive", red: 645, blue: 280961 },
  "100153782": { orientation: "progressive", red: 5761, blue: 496467 },
  "100153784": { orientation: "progressive", red: 279, blue: 205220 },
  "100153785": { orientation: "progressive", red: 23947, blue: 829842 },
  "100153786": { orientation: "progressive", red: 148279, blue: 403687 },
  "100153787": { orientation: "progressive", red: 78498, blue: 212405 },
  "100153788": { orientation: "progressive", red: 5868, blue: 620840 },
  "100153791": { orientation: "progressive", red: 53605, blue: 104308 },
  "100153794": { orientation: "progressive", red: 52173, blue: 309450 },
  "100153797": { orientation: "progressive", red: 2233, blue: 956433 },
  "100153800": { orientation: "conservative", red: 1622546, blue: 60836 },
  "100153805": { orientation: "progressive", red: 13718, blue: 788270 },
  "100153814": { orientation: "progressive", red: 11098, blue: 959839 },
  "100153820": { orientation: "conservative", red: 185145, blue: 72405 },
  "100153823": { orientation: "progressive", red: 2201, blue: 468852 },
  "100153825": { orientation: "progressive", red: 15093, blue: 429251 },
  "100153847": { orientation: "conservative", red: 6995631, blue: 110220 },
  "100153856": { orientation: "progressive", red: 5649, blue: 507280 },
  "100155563": { orientation: "progressive", red: 1915, blue: 1054728 },
  "100156317": { orientation: "conservative", red: 270521, blue: 24176 },
  "100156976": { orientation: "conservative", red: 141681, blue: 99408 },
  "100156980": { orientation: "progressive", red: 7808, blue: 1063080 },
  "100160241": { orientation: "progressive", red: 3096, blue: 129567 },
  "100160673": { orientation: "progressive", red: 6933, blue: 917569 },
  "100161017": { orientation: "progressive", red: 4382, blue: 785733 },
  "100161493": { orientation: "progressive", red: 6033, blue: 928733 },
  "100162085": { orientation: "progressive", red: 959, blue: 414512 },
  "100162107": { orientation: "progressive", red: 8479, blue: 1109270 },
  "100162320": { orientation: "conservative", red: 715975, blue: 196554 },
  "100162500": { orientation: "conservative", red: 162726, blue: 2543 },
  "100162788": { orientation: "progressive", red: 12025, blue: 519585 },
  "100162804": { orientation: "progressive", red: 35368, blue: 161404 },
  "100162806": { orientation: "progressive", red: 7562, blue: 1088825 },
  "100162976": { orientation: "conservative", red: 299934, blue: 207877 },
  "100163064": { orientation: "progressive", red: 65123, blue: 126298 },
  "100163258": { orientation: "conservative", red: 255099, blue: 141752 },
  "100163408": { orientation: "progressive", red: 5170, blue: 233263 },
  "100163844": { orientation: "conservative", red: 188182, blue: 3705 }
};

const manuallyVerifiedEducationOrientations: Record<
  string,
  EducationOrientationId
> = {
  "100163064": "conservative"
};

const progressiveRules: OrientationRule[] = [
  { keyword: "학생인권", weight: 8 },
  { keyword: "노동인권", weight: 7 },
  { keyword: "민주진보", weight: 7 },
  { keyword: "마을교육공동체", weight: 6 },
  { keyword: "성평등", weight: 5 },
  { keyword: "민주시민", weight: 5 },
  { keyword: "혁신학교", weight: 5 },
  { keyword: "혁신교육", weight: 4 },
  { keyword: "생태전환", weight: 5 },
  { keyword: "기후위기", weight: 4 },
  { keyword: "평화통일", weight: 4 },
  { keyword: "학생자치", weight: 4 },
  { keyword: "교육공공성", weight: 4 },
  { keyword: "공공성", weight: 3 },
  { keyword: "보편복지", weight: 3 },
  { keyword: "대안교육", weight: 3 },
  { keyword: "차별", weight: 3 },
  { keyword: "생태", weight: 3 },
  { keyword: "평등", weight: 3 },
  { keyword: "다문화", weight: 2 },
  { keyword: "무상", weight: 2 },
  { keyword: "교육복지", weight: 2 },
  { keyword: "돌봄", weight: 1 }
];

const conservativeRules: OrientationRule[] = [
  { keyword: "자유민주주의", weight: 8 },
  { keyword: "자유민주", weight: 7 },
  { keyword: "수월성", weight: 7 },
  { keyword: "학력진단", weight: 6 },
  { keyword: "진단평가", weight: 6 },
  { keyword: "기초학력", weight: 5 },
  { keyword: "학업성취", weight: 5 },
  { keyword: "학교선택", weight: 5 },
  { keyword: "생활지도", weight: 4 },
  { keyword: "인성교육", weight: 4 },
  { keyword: "나라사랑", weight: 4 },
  { keyword: "교육 정상화", weight: 4 },
  { keyword: "정상화", weight: 3 },
  { keyword: "교권", weight: 3 },
  { keyword: "역사교육", weight: 3 },
  { keyword: "안보", weight: 3 },
  { keyword: "경쟁력", weight: 3 },
  { keyword: "인성", weight: 2 },
  { keyword: "대입", weight: 2 },
  { keyword: "입시", weight: 2 },
  { keyword: "공정", weight: 2 },
  { keyword: "자율", weight: 1 }
];

const policyAxisRules: PolicyAxisRule[] = [
  {
    id: "achievement",
    label: "학력·수월성",
    keywords: [
      "학력",
      "기초학력",
      "학업성취",
      "수월성",
      "진단평가",
      "학력진단",
      "대입",
      "입시",
      "영재"
    ]
  },
  {
    id: "digital",
    label: "AI·디지털·미래교육",
    keywords: [
      "AI",
      "인공지능",
      "디지털",
      "미래교육",
      "에듀테크",
      "코딩",
      "소프트웨어",
      "디지털교과서"
    ]
  },
  {
    id: "welfare",
    label: "교육복지·돌봄",
    keywords: [
      "복지",
      "교육복지",
      "돌봄",
      "무상",
      "급식",
      "교복",
      "체육복",
      "바우처",
      "통학",
      "수당"
    ]
  },
  {
    id: "teacher-safety",
    label: "교권·학교안전",
    keywords: [
      "교권",
      "교사",
      "생활지도",
      "학교폭력",
      "안전",
      "상담",
      "정서",
      "마음",
      "보호"
    ]
  },
  {
    id: "career-region",
    label: "진로·직업·지역연계",
    keywords: [
      "진로",
      "직업",
      "취업",
      "창업",
      "지역",
      "산학",
      "대학",
      "마을",
      "캠퍼스"
    ]
  },
  {
    id: "civic-rights",
    label: "민주시민·인권·생태",
    keywords: [
      "민주시민",
      "인권",
      "학생인권",
      "자치",
      "평화",
      "생태",
      "기후",
      "환경",
      "노동",
      "차별",
      "성평등"
    ]
  },
  {
    id: "administration",
    label: "행정·재정·시설",
    keywords: ["행정", "예산", "재정", "시설", "급식실", "체육관", "업무", "감축"]
  },
  {
    id: "customized",
    label: "유아·특수·맞춤교육",
    keywords: [
      "유아",
      "특수",
      "특수교육",
      "장애",
      "다문화",
      "맞춤",
      "개별",
      "느린학습자",
      "학교밖"
    ]
  }
];

function orientationOption(id: EducationOrientationId) {
  return (
    educationOrientationOptions.find((option) => option.id === id) ??
    educationOrientationOptions[1]
  );
}

function candidateText(candidate: Candidate) {
  return [
    candidate.candidateName,
    candidate.job,
    candidate.education,
    ...candidate.careers,
    ...candidate.pledges.flatMap((pledge) => [
      pledge.title,
      pledge.summary,
      pledge.category,
      ...pledge.details,
      ...(pledge.detailSections ?? []).flatMap((section) => [
        section.title,
        ...section.looseLines,
        ...section.items.flatMap((item) => [item.text, ...item.details])
      ])
    ])
  ]
    .filter(Boolean)
    .join(" ")
    .normalize("NFKC");
}

function countKeyword(text: string, keyword: string) {
  const normalizedText = text.toLocaleLowerCase("ko-KR");
  const normalizedKeyword = keyword.normalize("NFKC").toLocaleLowerCase("ko-KR");
  let count = 0;
  let index = normalizedText.indexOf(normalizedKeyword);

  while (index !== -1) {
    count += 1;
    index = normalizedText.indexOf(normalizedKeyword, index + normalizedKeyword.length);
  }

  return count;
}

function scoreRules(text: string, rules: OrientationRule[]) {
  const evidence = rules
    .map((rule) => {
      const count = countKeyword(text, rule.keyword);
      const score = Math.min(count, 4) * rule.weight;

      return {
        keyword: rule.keyword,
        count,
        score
      };
    })
    .filter((item) => item.count > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.count - left.count ||
        left.keyword.localeCompare(right.keyword, "ko")
    );

  return {
    evidence,
    score: evidence.reduce((total, item) => total + item.score, 0)
  };
}

function classifyConfidence(
  progressiveScore: number,
  conservativeScore: number
): EducationOrientationConfidence {
  const totalScore = progressiveScore + conservativeScore;
  const scoreGap = Math.abs(progressiveScore - conservativeScore);

  if (totalScore < 10 || scoreGap < 6) {
    return "low";
  }

  if (scoreGap >= 18 && scoreGap / totalScore >= 0.45) {
    return "high";
  }

  if (scoreGap >= 10 && scoreGap / totalScore >= 0.28) {
    return "medium";
  }

  return "low";
}

function classifyColorConfidence({
  blue,
  red
}: EducationColorOrientationEvidence): EducationOrientationConfidence {
  const total = blue + red;
  const gapRatio = total > 0 ? Math.abs(blue - red) / total : 0;

  if (total >= 100000 && gapRatio >= 0.35) {
    return "high";
  }

  if (total >= 10000 && gapRatio >= 0.15) {
    return "medium";
  }

  return "low";
}

function classifyOrientation(
  progressiveScore: number,
  conservativeScore: number
): EducationOrientationId {
  return progressiveScore > conservativeScore ? "progressive" : "conservative";
}

function verifiedColorOrientation(candidate: Candidate) {
  const candidateApiId = candidate.source.candidateApiId;

  return candidateApiId
    ? verifiedEducationColorOrientations[candidateApiId]
    : undefined;
}

function manuallyVerifiedOrientation(candidate: Candidate) {
  const candidateApiId = candidate.source.candidateApiId;

  return candidateApiId
    ? manuallyVerifiedEducationOrientations[candidateApiId]
    : undefined;
}

function classifyPolicyAxes(text: string): EducationPolicyAxis[] {
  return policyAxisRules
    .map((axis) => {
      const matchedKeywords = axis.keywords
        .map((keyword) => ({
          keyword,
          count: countKeyword(text, keyword)
        }))
        .filter((item) => item.count > 0)
        .sort(
          (left, right) =>
            right.count - left.count ||
            left.keyword.localeCompare(right.keyword, "ko")
        );

      return {
        id: axis.id,
        label: axis.label,
        count: matchedKeywords.reduce((total, item) => total + item.count, 0),
        keywords: matchedKeywords.slice(0, 4).map((item) => item.keyword)
      };
    })
    .filter((axis) => axis.count > 0)
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label, "ko")
    );
}

export function classifyEducationCandidate(
  candidate: Candidate
): EducationOrientationProfile {
  const text = candidateText(candidate);
  const progressive = scoreRules(text, progressiveRules);
  const conservative = scoreRules(text, conservativeRules);
  const manualOrientationId = manuallyVerifiedOrientation(candidate);
  const colorOrientation = verifiedColorOrientation(candidate);
  const orientationId =
    manualOrientationId ??
    colorOrientation?.orientation ??
    classifyOrientation(progressive.score, conservative.score);

  return {
    basis: manualOrientationId ? "manual" : colorOrientation ? "color" : "keyword",
    colorEvidence: !manualOrientationId && colorOrientation
      ? { blue: colorOrientation.blue, red: colorOrientation.red }
      : undefined,
    confidence: manualOrientationId
      ? "high"
      : colorOrientation
        ? classifyColorConfidence(colorOrientation)
        : classifyConfidence(progressive.score, conservative.score),
    conservativeScore: conservative.score,
    evidence: {
      conservative: conservative.evidence.slice(0, 6),
      progressive: progressive.evidence.slice(0, 6)
    },
    orientation: orientationOption(orientationId),
    policyAxes: classifyPolicyAxes(text).slice(0, 4),
    progressiveScore: progressive.score
  };
}

export function filterEducationCandidatesByOrientation(
  candidates: Candidate[],
  orientationId: EducationOrientationId | undefined
) {
  if (!orientationId) {
    return candidates;
  }

  const validOrientation = educationOrientationOptions.some(
    (option) => option.id === orientationId
  );

  if (!validOrientation) {
    return candidates;
  }

  return candidates.filter(
    (candidate) => classifyEducationCandidate(candidate).orientation.id === orientationId
  );
}
