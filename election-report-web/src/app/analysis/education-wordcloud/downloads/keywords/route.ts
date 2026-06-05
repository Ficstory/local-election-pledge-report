import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const csvPath = path.join(
  process.cwd(),
  "storage",
  "analysis",
  "20260603",
  "education-top-five-keywords",
  "detailed-keyword-coverage.csv"
);

export async function GET() {
  const csv = await readFile(csvPath, "utf8");

  return new Response(csv, {
    headers: {
      "Content-Disposition":
        'attachment; filename="education-superintendent-keyword-coverage.csv"',
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
