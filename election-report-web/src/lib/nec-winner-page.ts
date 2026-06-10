export const NEC_WINNER_PAGE_SOURCE = "NEC_WINNER_PAGE";

export const NEC_WINNER_PAGE_ENDPOINT =
  "https://info.nec.go.kr/electioninfo/electionInfo_report.xhtml";

export const NEC_WINNER_PAGE_MAIN_URL =
  "https://info.nec.go.kr/main/showDocument.xhtml";

export type NecWinnerPageRecord = {
  address?: string;
  birthDate?: string;
  candidateApiId: string;
  career?: string;
  education?: string;
  gender?: string;
  hanjaName?: string;
  job?: string;
  name: string;
  partyName?: string;
  regionName: string;
  voteCount: number;
  voteRate: string;
};

export function buildWinnerStatementId(sgTypecode: string) {
  return `EPEI01_#${sgTypecode}`;
}

export function buildWinnerPageRequestParams({
  cityCode = "-1",
  electionId,
  sgTypecode
}: {
  cityCode?: string;
  electionId: string;
  sgTypecode: string;
}) {
  return new URLSearchParams({
    cityCode,
    electionCode: sgTypecode,
    electionId: `00${electionId}`,
    electionName: electionId,
    electionType: "4",
    menuId: "EPEI01",
    oldElectionType: "1",
    proportionalRepresentationCode: "-1",
    requestURI: `/electioninfo/00${electionId}/ep/epei01.jsp`,
    secondMenuId: "EPEI01",
    sggCityCode: "0",
    sggTownCode: "-1",
    statementId: buildWinnerStatementId(sgTypecode),
    topMenuId: "EP",
    townCode: "-1"
  });
}

export function buildWinnerPageMainUrl(electionId: string) {
  const url = new URL(NEC_WINNER_PAGE_MAIN_URL);
  url.searchParams.set("electionId", `00${electionId}`);
  url.searchParams.set("secondMenuId", "EPEI01");
  url.searchParams.set("topMenuId", "EP");

  return url.toString();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, codePoint: string) =>
      String.fromCodePoint(Number(codePoint))
    );
}

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?\s*>/gi, " / ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function parseName(value: string) {
  const [name, hanja] = value.split("/").map((part) => part.trim());

  return {
    hanjaName: hanja?.replace(/^\(/, "").replace(/\)$/, "") || undefined,
    name
  };
}

function parseBirthDate(value: string) {
  return value.split("/")[0]?.trim() || undefined;
}

function parseVote(value: string) {
  const [voteCountRaw, voteRateRaw] = value.split("/");
  const voteCount = Number(voteCountRaw?.replace(/[^\d]/g, ""));
  const voteRate = voteRateRaw?.replace(/[()%]/g, "").trim();

  return {
    voteCount: Number.isFinite(voteCount) ? voteCount : 0,
    voteRate: voteRate || "0"
  };
}

function extractCells(rowHtml: string) {
  return [...rowHtml.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(
    (cell) => stripHtml(cell[1] ?? "")
  );
}

function extractCandidateApiId(rowHtml: string) {
  return (
    rowHtml.match(/\/Hb(\d+)\//i)?.[1] ??
    rowHtml.match(/thumbnail\.(\d+)\.JPG/i)?.[1]
  );
}

export function parseNecWinnerPage(html: string): NecWinnerPageRecord[] {
  const tableHtml =
    html.match(/<table[^>]+id=["']table01["'][\s\S]*?<\/table>/i)?.[0] ?? "";
  const rows = [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)]
    .map((match) => match[0] ?? "")
    .slice(1);

  return rows
    .map((rowHtml): NecWinnerPageRecord | undefined => {
      const cells = extractCells(rowHtml);
      const candidateApiId = extractCandidateApiId(rowHtml);
      const hasPartyColumn = cells.length >= 11;
      const offset = hasPartyColumn ? 1 : 0;

      if (!candidateApiId || cells.length < 10) {
        return undefined;
      }

      const { hanjaName, name } = parseName(cells[2 + offset] ?? "");
      const { voteCount, voteRate } = parseVote(cells[9 + offset] ?? "");

      if (!name) {
        return undefined;
      }

      return {
        address: cells[5 + offset] || undefined,
        birthDate: parseBirthDate(cells[4 + offset] ?? ""),
        candidateApiId,
        career: cells[8 + offset] || undefined,
        education: cells[7 + offset] || undefined,
        gender: cells[3 + offset] || undefined,
        hanjaName,
        job: cells[6 + offset] || undefined,
        name,
        partyName: hasPartyColumn ? cells[1] || undefined : undefined,
        regionName: cells[0] ?? "",
        voteCount,
        voteRate
      };
    })
    .filter((record): record is NecWinnerPageRecord => Boolean(record));
}
