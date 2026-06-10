import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const electionId = "20260603";
const outputRoot = path.join(
  process.cwd(),
  "storage",
  "analysis",
  electionId,
  "candidate-criminal-records"
);
const defaultInput = path.join(outputRoot, "summary.json");
const defaultImageRoot = path.join(outputRoot, "ocr-pages");
const unresolvedStatuses = new Set(["UNKNOWN", "UNAVAILABLE"]);

function parseArgs(argv) {
  const args = {};

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, value] = arg.slice(2).split("=", 2);
    args[key] = value ?? "true";
  }

  return args;
}

function bundledNodeModuleRoots() {
  const home = os.homedir();
  const runtimeNodeModules = path.join(
    home,
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "node",
    "node_modules"
  );

  return [
    ...String(process.env.NODE_PATH || "")
      .split(path.delimiter)
      .filter(Boolean),
    path.join(process.cwd(), "node_modules"),
    runtimeNodeModules,
    path.join(runtimeNodeModules, ".pnpm", "node_modules")
  ];
}

async function importFromSearchRoots(packageName) {
  for (const root of bundledNodeModuleRoots()) {
    try {
      const requireFromRoot = createRequire(path.join(root, "_resolve.js"));
      const resolved = requireFromRoot.resolve(packageName);

      return import(pathToFileURL(resolved).href);
    } catch {
      // Try the next root.
    }
  }

  return import(packageName);
}

function chromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

function selectedRecords(summary, args) {
  const statuses = new Set(
    String(args.statuses || "")
      .split(",")
      .map((status) => status.trim())
      .filter(Boolean)
  );
  const selectedStatuses = statuses.size > 0 ? statuses : unresolvedStatuses;
  const limit = args.limit ? Number(args.limit) : Infinity;

  return (summary.records || [])
    .filter((record) => selectedStatuses.has(record.status))
    .filter((record) => record.candidateApiId && record.materialPath)
    .slice(0, Number.isFinite(limit) ? limit : undefined);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), args.input || defaultInput);
  const imageRoot = path.resolve(process.cwd(), args.output || defaultImageRoot);
  const summary = JSON.parse(await readFile(inputPath, "utf8"));
  const records = selectedRecords(summary, args);
  const playwright = await importFromSearchRoots("playwright");
  const chromium = playwright.chromium ?? playwright.default?.chromium;
  const executablePath = chromeExecutable();
  const pageNumber = Number(args.page || 2);
  const scrollY = Number(args.scrollY || 0);
  const zoom = Number(args.zoom || 150);
  const waitMs = Number(args.waitMs || 1500);

  await mkdir(imageRoot, { recursive: true });

  if (!chromium) {
    throw new Error("Could not load Playwright chromium launcher.");
  }

  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true
  });
  const page = await browser.newPage({
    viewport: {
      height: Number(args.height || 2200),
      width: Number(args.width || 1600)
    }
  });

  let rendered = 0;
  let skipped = 0;

  for (const record of records) {
    const imagePath = path.join(imageRoot, `${record.candidateApiId}.png`);

    if (existsSync(imagePath) && args.force !== "true") {
      skipped += 1;
      continue;
    }

    const pdfPath = path.resolve(process.cwd(), record.materialPath);
    const url = `${pathToFileURL(pdfPath).href}#page=${pageNumber}&zoom=${zoom}`;

    await page.goto(url, {
      timeout: Number(args.timeout || 30000),
      waitUntil: "domcontentloaded"
    });
    await page.waitForTimeout(waitMs);

    if (scrollY > 0) {
      await page.mouse.move(
        Number(args.width || 1600) / 2,
        Number(args.height || 2200) / 2
      );
      await page.mouse.wheel(0, scrollY);
      await page.waitForTimeout(Math.min(750, waitMs));
    }

    await page.screenshot({
      fullPage: false,
      path: imagePath
    });
    rendered += 1;

    if (rendered % 25 === 0) {
      console.log(`Rendered ${rendered}/${records.length} OCR pages`);
    }
  }

  await browser.close();
  console.log(
    `OCR page render complete: rendered ${rendered}, skipped ${skipped}, target ${records.length}`
  );
  console.log(imageRoot);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
