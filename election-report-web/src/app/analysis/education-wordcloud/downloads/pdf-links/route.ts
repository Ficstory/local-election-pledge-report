import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

type MaterialRow = {
  materialType: string;
  title: string;
  fileName: string;
  sourceUrl: string;
  storagePath: string;
  candidate: {
    candidateApiId: string;
    name: string;
    regionName: string;
    districtName: string;
  };
};

type ExtractionRow = {
  candidateApiId: string;
  pageCount: number;
  storagePath: string;
};

const manifestPath = path.join(
  process.cwd(),
  "storage",
  "material-groups",
  "20260603",
  "education-superintendents-downloaded.jsonl"
);

const extractionPath = path.join(
  process.cwd(),
  "storage",
  "analysis",
  "20260603",
  "education-top-five-keywords",
  "extraction-summary.jsonl"
);

function parseJsonl<T>(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function csvCell(value: string | number | undefined) {
  const text = value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const [manifestRaw, extractionRaw] = await Promise.all([
    readFile(manifestPath, "utf8"),
    readFile(extractionPath, "utf8")
  ]);
  const extractionByPath = new Map(
    parseJsonl<ExtractionRow>(extractionRaw).map((row) => [
      row.storagePath,
      row.pageCount
    ])
  );
  const rows = parseJsonl<MaterialRow>(manifestRaw)
    .filter((row) => row.materialType === "TOP_FIVE_PLEDGES")
    .sort((left, right) =>
      left.candidate.regionName.localeCompare(right.candidate.regionName, "ko-KR") ||
      left.candidate.name.localeCompare(right.candidate.name, "ko-KR")
    );
  const header = [
    "candidate_name",
    "region_name",
    "district_name",
    "title",
    "file_name",
    "page_count",
    "source_url",
    "local_storage_path"
  ];
  const csv = [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.candidate.name,
        row.candidate.regionName,
        row.candidate.districtName,
        row.title,
        row.fileName,
        extractionByPath.get(row.storagePath),
        row.sourceUrl,
        row.storagePath
      ]
        .map(csvCell)
        .join(",")
    )
  ].join("\n");

  return new Response(`\uFEFF${csv}\n`, {
    headers: {
      "Content-Disposition":
        'attachment; filename="education-superintendent-top-five-pdf-links.csv"',
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
