import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  AnimatedEducationWordCloud,
  type CloudDataset,
  type CloudWord
} from "./AnimatedEducationWordCloud";

export const dynamic = "force-dynamic";

type KeywordSummary = {
  generatedAt: string;
  totalPages: number;
  topDetailedKeywords: Array<{
    keyword: string;
    count: number;
    candidateCount: number;
    candidateRate: number;
  }>;
  policyCategories: Array<{
    category: string;
    count: number;
    topTerms: Array<{
      keyword: string;
      count: number;
    }>;
  }>;
  topPhrases: Array<{
    keyword: string;
    count: number;
  }>;
};

const summaryPath = path.join(
  process.cwd(),
  "storage",
  "analysis",
  "20260603",
  "education-top-five-keywords",
  "summary.json"
);

async function loadSummary() {
  const raw = await readFile(summaryPath, "utf8");
  return JSON.parse(raw) as KeywordSummary;
}

function categoryWords(summary: KeywordSummary): CloudWord[] {
  return summary.policyCategories.map((category) => ({
    text: category.category,
    count: category.count,
    detail: category.topTerms
      .slice(0, 4)
      .map((term) => `${term.keyword} ${term.count}`)
      .join(" / ")
  }));
}

function detailedWords(summary: KeywordSummary): CloudWord[] {
  return summary.topDetailedKeywords.map((keyword) => ({
    text: keyword.keyword,
    count: keyword.count,
    candidateCount: keyword.candidateCount,
    candidateRate: keyword.candidateRate
  }));
}

function phraseWords(summary: KeywordSummary): CloudWord[] {
  return summary.topPhrases
    .filter((phrase) => !phrase.keyword.includes("교육청 자체"))
    .slice(0, 40)
    .map((phrase) => ({
      text: phrase.keyword,
      count: phrase.count
    }));
}

function buildDatasets(summary: KeywordSummary): CloudDataset[] {
  return [
    {
      id: "details",
      label: "상위 키워드",
      words: detailedWords(summary)
    },
    {
      id: "categories",
      label: "분야별 분포",
      words: categoryWords(summary)
    },
    {
      id: "phrases",
      label: "공통 반복 문구",
      words: phraseWords(summary)
    }
  ];
}

export default async function EducationWordCloudPage() {
  const summary = await loadSummary();
  const generatedAt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(new Date(summary.generatedAt));

  return (
    <main className="page-shell wordcloud-page">
      <AnimatedEducationWordCloud
        datasets={buildDatasets(summary)}
        generatedAt={generatedAt}
        pageCount={summary.totalPages}
      />
    </main>
  );
}
