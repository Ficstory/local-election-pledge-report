import type { Candidate } from "../types/election";

export type EducationOrientationId = "progressive" | "conservative";
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

export type EducationOrientationProfile = {
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

function classifyOrientation(
  progressiveScore: number,
  conservativeScore: number
): EducationOrientationId {
  return progressiveScore > conservativeScore ? "progressive" : "conservative";
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
  const orientationId = classifyOrientation(
    progressive.score,
    conservative.score
  );

  return {
    confidence: classifyConfidence(progressive.score, conservative.score),
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
