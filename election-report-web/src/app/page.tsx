import { readFile } from "node:fs/promises";
import path from "node:path";

import Link from "next/link";

import provincesGeo from "../../public/geodata/kr/skorea_provinces_geo_simple.json";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  ChartPie,
  ChevronRight,
  Database,
  Download,
  FileText,
  GitCompareArrows,
  Info,
  MapPinned,
  Search,
  ShieldCheck,
  UserSearch,
  UsersRound
} from "lucide-react";

import { MayorPledgeAnalysis } from "./MayorPledgeAnalysis";
import {
  type CandidateListFilters,
  type ElectionCandidateOption,
  listElectionCandidateOptionsByFilters,
  listElectionCandidatesByFilters
} from "../lib/election-db";
import { getElectionSummary, officeLabels } from "../lib/election-stats";
import {
  classifyEducationCandidate,
  educationOrientationOptions,
  filterEducationCandidatesByOrientation,
  type EducationOrientationId,
  type EducationOrientationProfile
} from "../lib/education-orientation";
import { buildExecutiveAnalysisPath } from "../lib/executive-analysis-api";
import {
  EXECUTIVE_PLEDGE_ANALYSIS_OUTPUT_DIR,
  type ExecutivePledgeAnalysisSummary
} from "../lib/executive-pledge-analysis";
import { type MayorPledgeFilter } from "../lib/mayor-pledge-analysis";
import {
  executiveAnalysisCopyByTab,
  isExecutiveElectionTab,
  officeTypeForElectionTab,
  parseElectionTab
} from "../lib/election-tabs";
import {
  CANDIDATE_LIST_PAGE_SIZE,
  normalizeCandidatePage
} from "../lib/candidate-pagination";
import {
  candidateElectionBulletinViewerUrl,
  candidateTopFivePledgeViewerUrl
} from "../lib/campaign-material-viewer";
import {
  criminalRecordClass,
  criminalRecordDetail,
  criminalRecordFilterLabel,
  criminalRecordFilterOptions,
  criminalRecordLabel,
  parseCriminalRecordStatus
} from "../lib/candidate-disclosure";
import type { Candidate, CandidateElectionResultStatus } from "../types/election";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type GeoPosition = [number, number];
type GeoRing = GeoPosition[];
type GeoPolygon = GeoRing[];
type GeoMultiPolygon = GeoPolygon[];

type ProvinceFeature = {
  geometry:
    | {
        coordinates: GeoPolygon;
        type: "Polygon";
      }
    | {
        coordinates: GeoMultiPolygon;
        type: "MultiPolygon";
      };
  properties: {
    base_year: string;
    code: string;
    name: string;
    name_eng: string;
  };
  type: "Feature";
};

type ProvinceFeatureCollection = {
  features: ProvinceFeature[];
  type: "FeatureCollection";
};

type EducationSortId =
  | "region"
  | "name"
  | "pledge-count"
  | "material-status"
  | "updated-at";

type EducationHrefKey =
  | "compare"
  | "criminalRecord"
  | "electionResult"
  | "orientation"
  | "policyAxis"
  | "q"
  | "region"
  | "sort";

type EducationHrefOverrides = Partial<
  Record<EducationHrefKey, null | string | undefined>
> & {
  page?: null | number;
};

const educationSortOptions: Array<{
  id: EducationSortId;
  label: string;
}> = [
  { id: "region", label: "지역순" },
  { id: "name", label: "이름순" },
  { id: "pledge-count", label: "공약 수 많은순" },
  { id: "material-status", label: "원문 자료 우선" },
  { id: "updated-at", label: "최근 확인순" }
];

const electionResultFilterOptions: Array<{
  id: CandidateElectionResultStatus;
  label: string;
}> = [
  { id: "ELECTED", label: "당선" },
  { id: "NOT_ELECTED", label: "낙선" },
  { id: "UNKNOWN", label: "결과 확인중" }
];

const officialEducationRegions = new Set([
  "강원특별자치도",
  "경기도",
  "경상남도",
  "경상북도",
  "광주광역시",
  "대구광역시",
  "대전광역시",
  "부산광역시",
  "서울특별시",
  "세종특별자치시",
  "울산광역시",
  "인천광역시",
  "전라남도",
  "전남광주통합특별시",
  "전북특별자치도",
  "제주특별자치도",
  "충청남도",
  "충청북도"
]);

const provinceFeatureCollection = provincesGeo as unknown as ProvinceFeatureCollection;
const koreaMapWidth = 220;
const koreaMapHeight = 250;
const koreaMapPadding = 12;

type ProvinceMapLabel = {
  href: string;
  label: string;
  name: string;
  x: number;
  y: number;
};

const landingProvinceRegionFilterByName: Record<string, string> = {
  강원도: "강원특별자치도",
  광주광역시: "전남광주통합특별시",
  전라남도: "전남광주통합특별시",
  전라북도: "전북특별자치도"
};

const landingProvinceLabelsByName: Record<
  string,
  Omit<ProvinceMapLabel, "href" | "name">
> = {
  강원도: { label: "강원도", x: 137, y: 62 },
  경기도: { label: "경기도", x: 91, y: 86 },
  경상남도: { label: "경상남도", x: 125, y: 151 },
  경상북도: { label: "경상북도", x: 143, y: 108 },
  광주광역시: { label: "광주", x: 71, y: 150 },
  대구광역시: { label: "대구", x: 136, y: 130 },
  대전광역시: { label: "대전", x: 94, y: 117 },
  부산광역시: { label: "부산", x: 152, y: 154 },
  서울특별시: { label: "서울", x: 86, y: 67 },
  세종특별자치시: { label: "세종", x: 98, y: 102 },
  울산광역시: { label: "울산", x: 160, y: 135 },
  인천광역시: { label: "인천", x: 58, y: 71 },
  전라남도: { label: "전라남도", x: 78, y: 169 },
  전라북도: { label: "전라북도", x: 88, y: 131 },
  제주특별자치도: { label: "제주도", x: 91, y: 220 },
  충청남도: { label: "충청남도", x: 65, y: 106 },
  충청북도: { label: "충청북도", x: 111, y: 103 }
};

function landingProvinceRegionName(provinceName: string) {
  return landingProvinceRegionFilterByName[provinceName] ?? provinceName;
}

function landingProvinceHref(provinceName: string) {
  const params = new URLSearchParams();
  params.set("election", "regional-executive");
  params.set("region", landingProvinceRegionName(provinceName));

  return `/?${params.toString()}`;
}

function getProvincePolygons(feature: ProvinceFeature): GeoPolygon[] {
  return feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
}

function collectProvincePositions(features: ProvinceFeature[]) {
  const positions: GeoPosition[] = [];

  for (const feature of features) {
    for (const polygon of getProvincePolygons(feature)) {
      for (const ring of polygon) {
        positions.push(...ring);
      }
    }
  }

  return positions;
}

const koreaMapBounds = collectProvincePositions(
  provinceFeatureCollection.features
).reduce(
  (bounds, [longitude, latitude]) => ({
    maxLatitude: Math.max(bounds.maxLatitude, latitude),
    maxLongitude: Math.max(bounds.maxLongitude, longitude),
    minLatitude: Math.min(bounds.minLatitude, latitude),
    minLongitude: Math.min(bounds.minLongitude, longitude)
  }),
  {
    maxLatitude: -Infinity,
    maxLongitude: -Infinity,
    minLatitude: Infinity,
    minLongitude: Infinity
  }
);

const koreaLongitudeSpan = koreaMapBounds.maxLongitude - koreaMapBounds.minLongitude;
const koreaLatitudeSpan = koreaMapBounds.maxLatitude - koreaMapBounds.minLatitude;
const koreaMapReferenceScale = Math.min(
  (koreaMapWidth - koreaMapPadding * 2) / koreaLongitudeSpan,
  (koreaMapHeight - koreaMapPadding * 2) / koreaLatitudeSpan
);
const koreaMapReferenceOffsetX =
  (koreaMapWidth - koreaLongitudeSpan * koreaMapReferenceScale) / 2;
const koreaMapReferenceOffsetY =
  (koreaMapHeight - koreaLatitudeSpan * koreaMapReferenceScale) / 2;
const koreaMapLongitudeFactor = Math.cos(
  (((koreaMapBounds.maxLatitude + koreaMapBounds.minLatitude) / 2) * Math.PI) /
    180
);
const koreaProjectedLongitudeSpan = koreaLongitudeSpan * koreaMapLongitudeFactor;
const koreaMapScale = Math.min(
  (koreaMapWidth - koreaMapPadding * 2) / koreaProjectedLongitudeSpan,
  (koreaMapHeight - koreaMapPadding * 2) / koreaLatitudeSpan
);
const koreaMapOffsetX =
  (koreaMapWidth - koreaProjectedLongitudeSpan * koreaMapScale) / 2;
const koreaMapOffsetY =
  (koreaMapHeight - koreaLatitudeSpan * koreaMapScale) / 2;

function projectKoreaPoint([longitude, latitude]: GeoPosition): GeoPosition {
  return [
    Number(
      (
        (longitude - koreaMapBounds.minLongitude) *
          koreaMapLongitudeFactor *
          koreaMapScale +
        koreaMapOffsetX
      ).toFixed(2)
    ),
    Number(
      (
        (koreaMapBounds.maxLatitude - latitude) * koreaMapScale +
        koreaMapOffsetY
      ).toFixed(2)
    )
  ];
}

function projectKoreaLabelPoint({
  x,
  y
}: Omit<ProvinceMapLabel, "href" | "label" | "name">): GeoPosition {
  const normalizedX =
    (x - koreaMapReferenceOffsetX) / (koreaLongitudeSpan * koreaMapReferenceScale);
  const normalizedY =
    (y - koreaMapReferenceOffsetY) / (koreaLatitudeSpan * koreaMapReferenceScale);

  return [
    Number(
      (
        koreaMapOffsetX +
        normalizedX * koreaProjectedLongitudeSpan * koreaMapScale
      ).toFixed(2)
    ),
    Number(
      (
        koreaMapOffsetY +
        normalizedY * koreaLatitudeSpan * koreaMapScale
      ).toFixed(2)
    )
  ];
}

const landingProvinceLabels = provinceFeatureCollection.features.flatMap((feature) => {
  const label = landingProvinceLabelsByName[feature.properties.name];

  if (!label) {
    return [];
  }

  const [x, y] = projectKoreaLabelPoint(label);

  return [
    {
      ...label,
      href: landingProvinceHref(feature.properties.name),
      name: feature.properties.name,
      x,
      y
    }
  ];
});

function positionsToBounds(positions: GeoPosition[]) {
  return positions.reduce(
    (bounds, [x, y]) => ({
      maxX: Math.max(bounds.maxX, x),
      maxY: Math.max(bounds.maxY, y),
      minX: Math.min(bounds.minX, x),
      minY: Math.min(bounds.minY, y)
    }),
    {
      maxX: -Infinity,
      maxY: -Infinity,
      minX: Infinity,
      minY: Infinity
    }
  );
}

const koreaMapProjectedBounds = positionsToBounds([
  ...collectProvincePositions(provinceFeatureCollection.features).map(projectKoreaPoint),
  ...landingProvinceLabels.map((label) => [label.x, label.y] satisfies GeoPosition)
]);
const koreaMapViewBoxPadding = 8;
const koreaMapViewBox = {
  height:
    koreaMapProjectedBounds.maxY -
    koreaMapProjectedBounds.minY +
    koreaMapViewBoxPadding * 2,
  width:
    koreaMapProjectedBounds.maxX -
    koreaMapProjectedBounds.minX +
    koreaMapViewBoxPadding * 2,
  x: koreaMapProjectedBounds.minX - koreaMapViewBoxPadding,
  y: koreaMapProjectedBounds.minY - koreaMapViewBoxPadding
};
const koreaMapViewBoxValue = [
  koreaMapViewBox.x.toFixed(2),
  koreaMapViewBox.y.toFixed(2),
  koreaMapViewBox.width.toFixed(2),
  koreaMapViewBox.height.toFixed(2)
].join(" ");
const koreaMapAspectRatio = `${koreaMapViewBox.width.toFixed(2)} / ${koreaMapViewBox.height.toFixed(2)}`;

function ringToPath(ring: GeoRing) {
  const projectedPoints = ring.map(projectKoreaPoint);

  if (projectedPoints.length === 0) {
    return "";
  }

  return `${projectedPoints
    .map(
      ([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`
    )
    .join(" ")} Z`;
}

function provinceToPath(feature: ProvinceFeature) {
  return getProvincePolygons(feature)
    .flatMap((polygon) => polygon.map(ringToPath))
    .filter(Boolean)
    .join(" ");
}

function singleParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseEducationOrientation(
  value: string | undefined
): EducationOrientationId | undefined {
  const orientation = value?.trim();

  return educationOrientationOptions.some((option) => option.id === orientation)
    ? (orientation as EducationOrientationId)
    : undefined;
}

function parseEducationSort(value: string | undefined): EducationSortId {
  const sortId = value?.trim();

  return educationSortOptions.some((option) => option.id === sortId)
    ? (sortId as EducationSortId)
    : "region";
}

function parseElectionResultStatus(
  value: string | undefined
): CandidateElectionResultStatus | undefined {
  const status = value?.trim();

  return electionResultFilterOptions.some((option) => option.id === status)
    ? (status as CandidateElectionResultStatus)
    : undefined;
}

function parsePolicyAxis(value: string | undefined) {
  const policyAxis = value?.trim();
  return policyAxis && /^[a-z-]+$/.test(policyAxis) ? policyAxis : undefined;
}

function parseCompareIds(value: string | undefined) {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  ].slice(0, 4);
}

function hasOverride(
  overrides: EducationHrefOverrides,
  key: EducationHrefKey | "page"
) {
  return Object.prototype.hasOwnProperty.call(overrides, key);
}

function buildEducationHref(
  params: Record<string, string | string[] | undefined>,
  overrides: EducationHrefOverrides = {}
) {
  const nextParams = new URLSearchParams();
  nextParams.set("election", "education");

  for (const key of [
    "q",
    "region",
    "criminalRecord",
    "electionResult",
    "orientation",
    "policyAxis",
    "sort",
    "compare"
  ] satisfies EducationHrefKey[]) {
    const rawValue = hasOverride(overrides, key)
      ? overrides[key]
      : singleParam(params, key);
    const value = typeof rawValue === "string" ? rawValue.trim() : "";

    if (value && !(key === "sort" && value === "region")) {
      nextParams.set(key, value);
    }
  }

  const pageValue = hasOverride(overrides, "page")
    ? overrides.page
    : parsePage(singleParam(params, "page"));
  const page = typeof pageValue === "number" ? pageValue : 1;

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  return `/?${nextParams.toString()}`;
}

function candidateMaterialUrl(candidate: Candidate) {
  return candidateTopFivePledgeViewerUrl(candidate);
}

function candidateElectionBulletinUrl(candidate: Candidate) {
  return candidateElectionBulletinViewerUrl(candidate);
}

function candidateLocation(
  candidate: Pick<Candidate, "districtName" | "regionName">
) {
  return candidate.districtName && candidate.districtName !== candidate.regionName
    ? `${candidate.regionName} ${candidate.districtName}`
    : candidate.regionName;
}

function hasVisibleBallotNumber(ballotNumber: string) {
  return ballotNumber.trim() !== "" && ballotNumber !== "없음";
}

function electionResultLabel(candidate: Candidate) {
  if (!candidate.result) {
    return undefined;
  }

  if (candidate.result.elected === true) {
    return "당선";
  }

  if (candidate.result.elected === false) {
    return "낙선";
  }

  return "결과 확인중";
}

function electionResultClass(candidate: Candidate) {
  if (candidate.result?.elected === true) {
    return "elected";
  }

  if (candidate.result?.elected === false) {
    return "not-elected";
  }

  return "unknown";
}

function electionResultFilterLabel(
  status: CandidateElectionResultStatus | undefined
) {
  return electionResultFilterOptions.find((option) => option.id === status)?.label;
}

function formatVoteRate(voteRate: number) {
  return `${voteRate.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })}%`;
}

function resultSummaryTitle(filters: CandidateListFilters) {
  return filters.query
    ? `"${filters.query}" 검색 결과`
    : "선택한 조건의 검색 결과";
}

function uniqueSorted(values: Array<string | undefined>) {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value)))
  ].sort((left, right) => left.localeCompare(right, "ko"));
}

function buildMayorOptions(mayorCandidates: ElectionCandidateOption[]) {
  const partyOrder = new Map<string, number>();
  const compareBallotOrder = (leftOrder: number, rightOrder: number) => {
    if (leftOrder === rightOrder) {
      return 0;
    }

    if (!Number.isFinite(leftOrder)) {
      return 1;
    }

    if (!Number.isFinite(rightOrder)) {
      return -1;
    }

    return leftOrder - rightOrder;
  };

  for (const candidate of mayorCandidates) {
    const order = Number(candidate.ballotNumber);
    const ballotOrder =
      Number.isFinite(order) && order > 0 ? order : Number.POSITIVE_INFINITY;
    const previousOrder = partyOrder.get(candidate.partyName);

    if (previousOrder === undefined || ballotOrder < previousOrder) {
      partyOrder.set(candidate.partyName, ballotOrder);
    }
  }

  return {
    districts: uniqueSorted(
      mayorCandidates.map((candidate) => candidate.districtName)
    ),
    regions: uniqueSorted(mayorCandidates.map((candidate) => candidate.regionName)),
    parties: [...partyOrder.entries()]
      .sort(
        ([leftParty, leftOrder], [rightParty, rightOrder]) =>
          compareBallotOrder(leftOrder, rightOrder) ||
          leftParty.localeCompare(rightParty, "ko")
      )
      .map(([partyName]) => partyName),
    candidates: mayorCandidates
      .map((candidate) => ({
        ballotNumber: candidate.ballotNumber,
        districtName: candidate.districtName,
        id: candidate.id,
        label: `${candidate.candidateName} (${candidateLocation(candidate)})`,
        partyName: candidate.partyName,
        regionName: candidate.regionName
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "ko"))
  };
}

function educationProfileEvidence(profile: EducationOrientationProfile) {
  const evidence =
    profile.orientation.id === "progressive"
      ? profile.evidence.progressive
      : profile.evidence.conservative;

  return evidence
    .slice(0, 3)
    .map((item) => item.keyword)
    .join(", ");
}

function educationProfilePolicyAxes(profile: EducationOrientationProfile) {
  return profile.policyAxes
    .slice(0, 2)
    .map((axis) => axis.label)
    .join(", ");
}

function materialStatusRank(candidate: Candidate) {
  if (candidate.material.status === "analyzed") {
    return 3;
  }

  if (candidate.material.status === "collected") {
    return 2;
  }

  return candidateMaterialUrl(candidate) ? 1 : 0;
}

function updatedAtTimestamp(candidate: Candidate) {
  return candidate.source.fetchedAt
    ? new Date(candidate.source.fetchedAt).getTime()
    : 0;
}

function compareByDefaultOrder(left: Candidate, right: Candidate) {
  return (
    left.regionName.localeCompare(right.regionName, "ko") ||
    (left.districtName ?? "").localeCompare(right.districtName ?? "", "ko") ||
    Number(left.ballotNumber || 999) - Number(right.ballotNumber || 999) ||
    left.candidateName.localeCompare(right.candidateName, "ko")
  );
}

function sortEducationCandidates(
  candidates: Candidate[],
  sortId: EducationSortId
) {
  return [...candidates].sort((left, right) => {
    switch (sortId) {
      case "name":
        return (
          left.candidateName.localeCompare(right.candidateName, "ko") ||
          compareByDefaultOrder(left, right)
        );
      case "pledge-count":
        return (
          right.pledges.length - left.pledges.length ||
          compareByDefaultOrder(left, right)
        );
      case "material-status":
        return (
          materialStatusRank(right) - materialStatusRank(left) ||
          compareByDefaultOrder(left, right)
        );
      case "updated-at":
        return (
          updatedAtTimestamp(right) - updatedAtTimestamp(left) ||
          compareByDefaultOrder(left, right)
        );
      case "region":
      default:
        return compareByDefaultOrder(left, right);
    }
  });
}

function buildPolicyAxisOptions(
  candidates: Candidate[],
  profiles: Map<string, EducationOrientationProfile>
) {
  const axisCounts = new Map<string, { count: number; label: string }>();

  for (const candidate of candidates) {
    const profile = profiles.get(candidate.id) ?? classifyEducationCandidate(candidate);

    for (const axis of profile.policyAxes) {
      const current = axisCounts.get(axis.id);
      axisCounts.set(axis.id, {
        count: (current?.count ?? 0) + 1,
        label: axis.label
      });
    }
  }

  return [...axisCounts.entries()]
    .map(([id, axis]) => ({ id, ...axis }))
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label, "ko")
    );
}

function summarizeUnrecognizedRegions(candidates: Candidate[]) {
  const regionCounts = new Map<string, number>();

  for (const candidate of candidates) {
    if (!officialEducationRegions.has(candidate.regionName)) {
      regionCounts.set(
        candidate.regionName,
        (regionCounts.get(candidate.regionName) ?? 0) + 1
      );
    }
  }

  return [...regionCounts.entries()]
    .map(([regionName, count]) => ({ count, regionName }))
    .sort((left, right) => left.regionName.localeCompare(right.regionName, "ko"));
}

function regionOptionLabel(region: string) {
  return officialEducationRegions.has(region) ? region : `${region} (확인 필요)`;
}

function compareToggleHref({
  candidateId,
  compareIds,
  params
}: {
  candidateId: string;
  compareIds: string[];
  params: Record<string, string | string[] | undefined>;
}) {
  const nextCompareIds = compareIds.includes(candidateId)
    ? compareIds.filter((id) => id !== candidateId)
    : [...compareIds, candidateId].slice(0, 4);

  return buildEducationHref(params, {
    compare: nextCompareIds.join(","),
    page: parsePage(singleParam(params, "page"))
  });
}

function shouldRenderLanding(
  params: Record<string, string | string[] | undefined>
) {
  const dashboardKeys = [
    "candidate",
    "compare",
    "criminalRecord",
    "election",
    "office",
    "orientation",
    "page",
    "party",
    "policyAxis",
    "q",
    "region",
    "sort"
  ];

  return !dashboardKeys.some((key) => Boolean(singleParam(params, key)?.trim()));
}

type LandingPolicyShare = {
  color: string;
  count: number;
  label: string;
  percent: number;
  value: string;
};

type LandingPreviewData = {
  analyzedDistrictCount: number;
  candidateCount: number;
  generatedAt: string;
  pledgeCount: number;
  policyCategoryCount: number;
  policyKeywordTotal: number;
  policyShares: LandingPolicyShare[];
  policyShareGradient: string;
};

type CsvRow = Record<string, string>;

type LandingPolicyCategoryRow = {
  category: string;
  count: number;
};

const landingPolicyShareColors = [
  "var(--color-blue-dark)",
  "var(--color-blue)",
  "color-mix(in srgb, var(--color-blue) 86%, white)",
  "color-mix(in srgb, var(--color-blue) 74%, white)",
  "color-mix(in srgb, var(--color-blue) 62%, white)",
  "color-mix(in srgb, var(--color-blue) 50%, white)",
  "color-mix(in srgb, var(--color-blue) 38%, white)",
  "color-mix(in srgb, var(--color-blue) 26%, white)",
  "color-mix(in srgb, var(--color-blue) 16%, white)"
];

function formatLandingInteger(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatLandingPercent(value: number) {
  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1
  })}%`;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      cell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(cell);
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell);
  return cells;
}

function parseCsvRows(rawCsv: string): CsvRow[] {
  const [headerLine, ...lines] = rawCsv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine ?? "");

  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const cells = parseCsvLine(line);

      return Object.fromEntries(
        headers.map((header, index) => [header, cells[index] ?? ""])
      );
    });
}

function buildPolicyShares(rows: LandingPolicyCategoryRow[]) {
  const sortedRows = [...rows].sort(
    (left, right) =>
      right.count - left.count || left.category.localeCompare(right.category, "ko")
  );
  const total = sortedRows.reduce((sum, row) => sum + row.count, 0);

  return sortedRows.map((row, index) => {
    const percent = total > 0 ? (row.count / total) * 100 : 0;

    return {
      color:
        landingPolicyShareColors[index] ??
        landingPolicyShareColors[landingPolicyShareColors.length - 1],
      count: row.count,
      label: row.category,
      percent,
      value: formatLandingPercent(percent)
    };
  });
}

function buildPolicyShareGradient(policyShares: LandingPolicyShare[]) {
  if (policyShares.length === 0) {
    return "conic-gradient(var(--color-blue-soft) 0deg 360deg)";
  }

  let currentDegree = 0;
  const segments = policyShares.map((share, index) => {
    const startDegree = currentDegree;
    currentDegree =
      index === policyShares.length - 1
        ? 360
        : currentDegree + share.percent * 3.6;

    return `${share.color} ${startDegree.toFixed(2)}deg ${currentDegree.toFixed(
      2
    )}deg`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

async function readLandingPreviewData(): Promise<LandingPreviewData> {
  const analysisDir = path.join(
    process.cwd(),
    EXECUTIVE_PLEDGE_ANALYSIS_OUTPUT_DIR
  );
  const [summaryRaw, categorySummaryRaw, candidateSummaryRaw] = await Promise.all([
    readFile(path.join(analysisDir, "summary.json"), "utf8"),
    readFile(path.join(analysisDir, "policy-category-summary.csv"), "utf8"),
    readFile(path.join(analysisDir, "candidate-keyword-summary.csv"), "utf8")
  ]);
  const summary = JSON.parse(summaryRaw) as ExecutivePledgeAnalysisSummary;
  const policyCategoryRows = parseCsvRows(categorySummaryRaw)
    .map((row) => ({
      category: row.category,
      count: Number(row.count)
    }))
    .filter((row) => row.category && Number.isFinite(row.count));
  const analyzedDistrictCount = new Set(
    parseCsvRows(candidateSummaryRaw).map((row) =>
      [row.sgTypecode, row.regionName, row.districtName, row.officeName].join("|")
    )
  ).size;
  const policyShares = buildPolicyShares(policyCategoryRows);

  return {
    analyzedDistrictCount,
    candidateCount: summary.counts.candidateCount,
    generatedAt: summary.generatedAt,
    pledgeCount: summary.counts.pledgeCount,
    policyCategoryCount: policyCategoryRows.length,
    policyKeywordTotal: policyCategoryRows.reduce(
      (sum, row) => sum + row.count,
      0
    ),
    policyShares,
    policyShareGradient: buildPolicyShareGradient(policyShares)
  };
}

function landingMetrics(previewData: LandingPreviewData) {
  return [
    {
      Icon: UsersRound,
      label: "분석 후보자",
      value: `${formatLandingInteger(previewData.candidateCount)}명`
    },
    {
      Icon: FileText,
      label: "분석 공약 수",
      value: `${formatLandingInteger(previewData.pledgeCount)}개`
    },
    {
      Icon: ShieldCheck,
      label: "정책 분야",
      value: `${formatLandingInteger(previewData.policyCategoryCount)}개`
    },
    {
      Icon: MapPinned,
      label: "분석 선거구",
      value: `${formatLandingInteger(previewData.analyzedDistrictCount)}개`
    }
  ];
}

const landingFeatures = [
  {
    description:
      "중앙선거관리위원회 공개데이터를 기반으로 정확하고 투명한 정보를 제공합니다.",
    Icon: Database,
    title: "신뢰할 수 있는 데이터"
  },
  {
    description:
      "공약의 키워드, 분야, 빈도, 지역별 분포까지 데이터로 입체적으로 분석합니다.",
    Icon: Search,
    title: "깊이 있는 분석"
  },
  {
    description:
      "후보자, 정당, 지역을 비교해 정책 경향과 선택의 차이를 한눈에 확인합니다.",
    Icon: GitCompareArrows,
    title: "비교로 보는 인사이트"
  },
  {
    description:
      "복잡한 데이터도 직관적인 시각화와 쉬운 탐색으로 누구나 활용할 수 있습니다.",
    Icon: Download,
    title: "누구나 활용 가능"
  }
];

const landingPreviewTabs = [
  { Icon: BarChart3, active: true, label: "공약 분석" },
  { Icon: UserSearch, active: false, label: "후보자 검색" },
  { Icon: BookOpenText, active: false, label: "교육감 분석" }
];

function LandingKoreaBoundaryMap() {
  return (
    <svg
      aria-label="시도 단위 대한민국 행정구역 경계"
      className="landing-korea-boundary-map"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox={koreaMapViewBoxValue}
    >
      <defs>
        <filter
          colorInterpolationFilters="sRGB"
          height="130%"
          id="landing-map-soft-shadow"
          width="130%"
          x="-15%"
          y="-15%"
        >
          <feDropShadow dx="0" dy="3" floodColor="#94a3b8" floodOpacity="0.2" stdDeviation="3" />
        </filter>
      </defs>
      <g filter="url(#landing-map-soft-shadow)">
        {provinceFeatureCollection.features.map((feature) => {
          const href = landingProvinceHref(feature.properties.name);

          return (
          <a
            aria-label={`${feature.properties.name} 시·도지사 분석 보기`}
            className="korea-province-link"
            href={href}
            key={feature.properties.code}
          >
            <path
              className="korea-province"
              clipRule="evenodd"
              d={provinceToPath(feature)}
              fillRule="evenodd"
            >
              <title>{`${feature.properties.name} 시·도지사 분석 보기`}</title>
            </path>
          </a>
          );
        })}
      </g>
      <g className="korea-label-layer">
        {landingProvinceLabels.map((label) => (
          <a
            aria-label={`${label.name} 시·도지사 분석 보기`}
            className="korea-map-label-link"
            href={label.href}
            key={label.name}
          >
            <text
              className="korea-map-label"
              textAnchor="middle"
              x={label.x}
              y={label.y}
            >
              {label.label}
            </text>
          </a>
        ))}
      </g>
    </svg>
  );
}

function LandingDashboardPreview({
  previewData
}: {
  previewData: LandingPreviewData;
}) {
  const metrics = landingMetrics(previewData);

  return (
    <aside
      aria-label="공약 분석 대시보드 미리보기"
      className="landing-dashboard-preview"
      id="analysis-method"
    >
      <div className="landing-preview-window">
        <div className="landing-preview-topbar">
          <strong>2026년 제9회 전국동시지방선거</strong>
          <Link className="landing-source-link" href="/#data-source">
            <Database aria-hidden="true" focusable="false" size={16} strokeWidth={2} />
            데이터 출처
          </Link>
        </div>

        <nav aria-label="미리보기 탭" className="landing-preview-tabs">
          {landingPreviewTabs.map((tab) => {
            const TabIcon = tab.Icon;

            return (
              <span className={tab.active ? "active" : undefined} key={tab.label}>
                <TabIcon
                  aria-hidden="true"
                  focusable="false"
                  size={16}
                  strokeWidth={2}
                />
                {tab.label}
              </span>
            );
          })}
        </nav>

        <section className="landing-preview-summary" aria-label="공약 분석 개요">
          <h2>공약 분석 개요</h2>
          <div className="landing-preview-metrics">
            {metrics.map((metric) => {
              const MetricIcon = metric.Icon;

              return (
                <div className="landing-preview-metric" key={metric.label}>
                  <span className="landing-preview-metric-icon" aria-hidden="true">
                    <MetricIcon focusable="false" size={18} strokeWidth={2} />
                  </span>
                  <small>{metric.label}</small>
                  <strong>{metric.value}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <div className="landing-preview-grid">
          <section className="landing-chart-card" aria-labelledby="policy-share-title">
            <h2 className="landing-card-title" id="policy-share-title">
              <ChartPie aria-hidden="true" focusable="false" size={18} strokeWidth={2} />
              정책 분야별 키워드 비중
            </h2>
            <div className="landing-chart-layout">
              <div
                aria-label={`${formatLandingInteger(
                  previewData.policyKeywordTotal
                )}개 분류 키워드 기준 정책 분야 비중`}
                className="landing-donut"
                role="img"
                style={{ background: previewData.policyShareGradient }}
              >
                <span>
                  <strong>{formatLandingInteger(previewData.policyKeywordTotal)}</strong>
                  분류 키워드
                </span>
              </div>
              <dl className="landing-chart-legend">
                {previewData.policyShares.map((share) => (
                  <div key={share.label}>
                    <dt>
                      <span
                        aria-hidden="true"
                        className="legend-dot"
                        style={{ background: share.color }}
                      />
                      {share.label}
                    </dt>
                    <dd>{share.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="landing-map-card" aria-labelledby="region-map-title">
            <h2 className="landing-card-title" id="region-map-title">
              <MapPinned aria-hidden="true" focusable="false" size={18} strokeWidth={2} />
              지역별 분석 결과보기
            </h2>
            <div className="landing-map-panel">
              <div
                className="landing-map-viewport"
                style={{ aspectRatio: koreaMapAspectRatio }}
              >
                <LandingKoreaBoundaryMap />
              </div>
            </div>
          </section>
        </div>

        <section className="landing-preview-cta">
          <div className="landing-preview-cta-icon" aria-hidden="true">
            <BarChart3 focusable="false" size={22} strokeWidth={2} />
          </div>
          <div>
            <h2>공약이 선택으로 이어졌을까?</h2>
            <p>공약의 약속과 실제 결과를 데이터로 확인해보세요.</p>
          </div>
          <Link className="landing-preview-button" href="/?election=regional-executive">
            시·도지사 분석 보기
            <ArrowRight aria-hidden="true" focusable="false" size={16} strokeWidth={2} />
          </Link>
        </section>
      </div>
    </aside>
  );
}

function LandingFeatureStrip() {
  return (
    <section className="landing-feature-strip" aria-label="주요 기능">
      {landingFeatures.map((feature) => {
        const FeatureIcon = feature.Icon;

        return (
          <article className="landing-feature-item" key={feature.title}>
            <span className="landing-feature-icon" aria-hidden="true">
              <FeatureIcon focusable="false" size={24} strokeWidth={2} />
            </span>
            <div>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div
        aria-label="데이터 활용 안내"
        className="landing-footer-notice"
        id="data-source"
      >
        <span className="landing-footer-notice-icon" aria-hidden="true">
          <Info focusable="false" size={18} strokeWidth={2} />
        </span>
        <p>
          본 서비스는 공공데이터를 기반으로 제공되며, 분석 결과는 참고 자료로 활용해 주세요.
        </p>
      </div>
      <nav aria-label="랜딩 하단 링크" className="landing-footer-links">
        <Link href="/#project-background">프로젝트배경</Link>
        <Link href="/#analysis-method">분석방법</Link>
        <Link href="/#data-source">데이터 출처</Link>
        <a href="https://github.com/sponsors/Ficstory" rel="noreferrer" target="_blank">
          개발자에게 커피사주기
        </a>
      </nav>
      <p>© 정치한번 읽어볼까. All rights reserved.</p>
    </footer>
  );
}

function ProjectLanding({
  previewData
}: {
  previewData: LandingPreviewData;
}) {
  return (
    <div className="landing-layout">
      <main className="page-shell landing-page">
        <section
          className="landing-hero"
          aria-labelledby="landing-title"
          id="project-background"
        >
          <div className="landing-hero-copy">
            <p className="eyebrow">중앙선거관리위원회 공개데이터 기반</p>
            <h1 id="landing-title">선거 공약과 결과를 함께 읽는 페이지</h1>
            <p className="lead">
              <span>후보자의 공약, 선거공보, 선거 결과를</span>{" "}
              <span>연결해 정책 흐름을 확인할 수 있습니다.</span>
            </p>
            <div className="landing-actions">
              <Link className="action-button primary" href="/?election=regional-executive">
                시·도지사 분석 보기
                <ArrowRight aria-hidden="true" focusable="false" size={18} strokeWidth={2} />
              </Link>
              <Link className="action-button secondary" href="/#landing-features">
                주요 기능 둘러보기
                <ChevronRight
                  aria-hidden="true"
                  focusable="false"
                  size={18}
                  strokeWidth={2}
                />
              </Link>
            </div>
            <p className="landing-source-note">
              <ShieldCheck aria-hidden="true" focusable="false" size={16} strokeWidth={2} />
              <span>중앙선거관리위원회 공식 공개데이터를 사용합니다.</span>
            </p>
          </div>
          <LandingDashboardPreview previewData={previewData} />
        </section>
        <div id="landing-features">
          <LandingFeatureStrip />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  if (shouldRenderLanding(params)) {
    const previewData = await readLandingPreviewData();

    return <ProjectLanding previewData={previewData} />;
  }

  const activeTab = parseElectionTab(singleParam(params, "election"));

  if (isExecutiveElectionTab(activeTab)) {
    const officeType = officeTypeForElectionTab(activeTab);
    const executiveFilters: MayorPledgeFilter = {
      candidateId: singleParam(params, "candidate")?.trim() || undefined,
      districtName: singleParam(params, "district")?.trim() || undefined,
      partyName: singleParam(params, "party")?.trim() || undefined,
      query: singleParam(params, "q")?.trim() || undefined,
      regionName: singleParam(params, "region")?.trim() || undefined
    };
    const executiveCandidates = await listElectionCandidateOptionsByFilters({
      officeType
    });
    const analysisUrl = buildExecutiveAnalysisPath({
      electionValue: activeTab,
      filters: executiveFilters
    });

    return (
      <main className="page-shell mayor-page">
        <MayorPledgeAnalysis
          analysisUrl={analysisUrl}
          copy={executiveAnalysisCopyByTab[activeTab]}
          electionValue={activeTab}
          filters={executiveFilters}
          key={`${activeTab}:${executiveFilters.regionName ?? ""}:${
            executiveFilters.districtName ?? ""
          }:${executiveFilters.partyName ?? ""}:${
            executiveFilters.candidateId ?? ""
          }:${
            executiveFilters.query ?? ""
          }`}
          options={buildMayorOptions(executiveCandidates)}
        />
      </main>
    );
  }

  const orientationId = parseEducationOrientation(singleParam(params, "orientation"));
  const sortId = parseEducationSort(singleParam(params, "sort"));
  const policyAxisId = parsePolicyAxis(singleParam(params, "policyAxis"));
  const criminalRecordStatus = parseCriminalRecordStatus(
    singleParam(params, "criminalRecord")
  );
  const electionResultStatus = parseElectionResultStatus(
    singleParam(params, "electionResult")
  );
  const compareIds = parseCompareIds(singleParam(params, "compare"));
  const filters: CandidateListFilters = {
    criminalRecordStatus,
    electionResultStatus,
    officeType: "education_superintendent",
    query: singleParam(params, "q")?.trim() || undefined,
    regionName: singleParam(params, "region")?.trim() || undefined
  };
  const page = parsePage(singleParam(params, "page"));
  const [baseEducationCandidates, allEducationCandidates] = await Promise.all([
    listElectionCandidatesByFilters(filters),
    listElectionCandidatesByFilters({ officeType: "education_superintendent" })
  ]);
  const allCandidateById = new Map(
    allEducationCandidates.map((candidate) => [candidate.id, candidate])
  );
  const baseProfiles = new Map(
    baseEducationCandidates.map((candidate) => [
      candidate.id,
      classifyEducationCandidate(candidate)
    ])
  );
  const orientationFilteredCandidates = filterEducationCandidatesByOrientation(
    baseEducationCandidates,
    orientationId
  );
  const policyAxisOptions = buildPolicyAxisOptions(
    orientationFilteredCandidates,
    baseProfiles
  );
  const selectedPolicyAxis = policyAxisOptions.find(
    (axis) => axis.id === policyAxisId
  );
  const axisFilteredCandidates = policyAxisId
    ? orientationFilteredCandidates.filter((candidate) => {
        const profile =
          baseProfiles.get(candidate.id) ?? classifyEducationCandidate(candidate);
        return profile.policyAxes.some((axis) => axis.id === policyAxisId);
      })
    : orientationFilteredCandidates;
  const sortedCandidates = sortEducationCandidates(axisFilteredCandidates, sortId);
  const pagination = normalizeCandidatePage({
    page,
    pageSize: CANDIDATE_LIST_PAGE_SIZE,
    totalCount: sortedCandidates.length
  });
  const candidates = sortedCandidates.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  );
  const candidateProfiles = new Map(
    sortedCandidates.map((candidate) => [
      candidate.id,
      baseProfiles.get(candidate.id) ?? classifyEducationCandidate(candidate)
    ])
  );
  const compareCandidates = compareIds
    .map((id) => allCandidateById.get(id))
    .filter((candidate): candidate is Candidate => Boolean(candidate));
  const compareProfiles = new Map(
    compareCandidates.map((candidate) => [
      candidate.id,
      classifyEducationCandidate(candidate)
    ])
  );
  const summary = getElectionSummary(sortedCandidates);
  const invalidRegions = summarizeUnrecognizedRegions(allEducationCandidates);
  const hasActiveFilters = Boolean(
    filters.query ||
      filters.regionName ||
      orientationId ||
      policyAxisId ||
      criminalRecordStatus ||
      electionResultStatus
  );
  const compareQuery = compareIds.join(",");
  const educationOptions = {
    regions: uniqueSorted(
      allEducationCandidates.map((candidate) => candidate.regionName)
    )
  };
  const selectedOrientation = orientationId
    ? educationOrientationOptions.find((option) => option.id === orientationId)
    : undefined;
  const selectedFilters = [
    officeLabels.education_superintendent,
    filters.regionName,
    criminalRecordFilterLabel(criminalRecordStatus),
    electionResultFilterLabel(electionResultStatus),
    selectedOrientation?.label,
    selectedPolicyAxis?.label
  ].filter((filter): filter is string => Boolean(filter));
  const relaxedHref = buildEducationHref(params, {
    criminalRecord: null,
    electionResult: null,
    orientation: null,
    page: 1,
    policyAxis: null,
    q: null,
    sort: sortId,
    ...(filters.regionName ? {} : { region: null })
  });

  return (
    <main className="page-shell">
      <section className="workspace-header public-header education-header">
        <div>
          <p className="eyebrow">2026 전국동시지방선거</p>
          <h1>교육감 후보 공약 검색</h1>
          <p className="lead">
            지역, 후보자 이름, 정책축으로 교육감 후보자의 공약과 원문 자료를
            확인하세요. 성향은 공약 원문 기반 자동 추정값입니다.
          </p>
          <div className="education-hero-actions">
            <Link className="action-button primary" href="#candidate-list-title">
              후보 목록으로 이동
            </Link>
            <Link
              className="action-button secondary"
              href="/analysis/education-wordcloud"
            >
              핵심 키워드 분석 보기
            </Link>
          </div>
        </div>
      </section>

      {invalidRegions.length > 0 ? (
        <section className="data-warning" role="status">
          <strong>지역명 확인 필요</strong>
          <p>
            {invalidRegions
              .map((region) => `${region.regionName} ${region.count}명`)
              .join(", ")}
            은 공식 시·도 명칭과 달라 데이터 정규화 검증이 필요합니다.
          </p>
        </section>
      ) : null}

      <section
        aria-labelledby="candidate-search-title"
        className="panel filter-panel search-panel"
      >
        <div className="search-panel-heading">
          <div>
            <h2 id="candidate-search-title">후보자 찾기</h2>
            <p>
              이름, 지역, 정책축, 성향, 전과 공개자료, 당선여부를 조합해 원하는
              후보자를 찾아보세요.
            </p>
          </div>
        </div>
        <form className="filter-form education-filter-form">
          <input name="election" type="hidden" value="education" />
          <input name="office" type="hidden" value="education_superintendent" />
          {policyAxisId ? (
            <input name="policyAxis" type="hidden" value={policyAxisId} />
          ) : null}
          {compareQuery ? (
            <input name="compare" type="hidden" value={compareQuery} />
          ) : null}
          <label>
            <span>검색어</span>
            <input
              defaultValue={filters.query ?? ""}
              name="q"
              placeholder="후보자 이름, 지역"
              type="search"
            />
          </label>
          <label>
            <span>지역</span>
            <select defaultValue={filters.regionName ?? ""} name="region">
              <option value="">전체</option>
              {educationOptions.regions.map((region) => (
                <option key={region} value={region}>
                  {regionOptionLabel(region)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>성향</span>
            <select defaultValue={orientationId ?? ""} name="orientation">
              <option value="">전체</option>
              {educationOrientationOptions.map((orientation) => (
                <option key={orientation.id} value={orientation.id}>
                  {orientation.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>전과 공개자료</span>
            <select
              defaultValue={criminalRecordStatus ?? ""}
              name="criminalRecord"
            >
              <option value="">전체</option>
              {criminalRecordFilterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>당선여부</span>
            <select
              defaultValue={electionResultStatus ?? ""}
              name="electionResult"
            >
              <option value="">전체</option>
              {electionResultFilterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>정렬</span>
            <select defaultValue={sortId} name="sort">
              {educationSortOptions.map((sortOption) => (
                <option key={sortOption.id} value={sortOption.id}>
                  {sortOption.label}
                </option>
              ))}
            </select>
          </label>
          <input name="page" type="hidden" value="1" />
          <div className="filter-actions">
            <button type="submit">검색</button>
            {hasActiveFilters ? (
              <Link
                href={buildEducationHref(params, {
                  criminalRecord: null,
                  electionResult: null,
                  orientation: null,
                  page: 1,
                  policyAxis: null,
                  q: null,
                  region: null,
                  sort: null
                })}
              >
                초기화
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {policyAxisOptions.length > 0 ? (
        <section className="policy-axis-filter" aria-label="정책축 빠른 필터">
          <strong>정책축</strong>
          <div>
            <Link
              aria-current={!policyAxisId ? "true" : undefined}
              className={`policy-axis-chip ${!policyAxisId ? "active" : ""}`}
              href={buildEducationHref(params, { page: 1, policyAxis: null })}
            >
              전체
            </Link>
            {policyAxisOptions.slice(0, 8).map((axis) => (
              <Link
                aria-current={policyAxisId === axis.id ? "true" : undefined}
                className={`policy-axis-chip ${
                  policyAxisId === axis.id ? "active" : ""
                }`}
                href={buildEducationHref(params, {
                  page: 1,
                  policyAxis: axis.id
                })}
                key={axis.id}
              >
                {axis.label}
                <span>{axis.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {hasActiveFilters ? (
        <section className="result-summary" aria-label="검색 결과 요약">
          <strong>{resultSummaryTitle(filters)}</strong>
          <span>{sortedCandidates.length.toLocaleString("ko-KR")}명</span>
          <span>공약 {summary.totalPledges.toLocaleString("ko-KR")}개</span>
          <span>
            {summary.collectedMaterials > 0 ? "원문 자료 있음" : "원문 자료 없음"}
          </span>
          {selectedFilters.length > 0 ? (
            <em>{selectedFilters.join(" · ")}</em>
          ) : null}
        </section>
      ) : null}

      {compareCandidates.length > 0 ? (
        <section
          aria-labelledby="candidate-compare-title"
          className="panel compare-panel"
        >
          <div className="panel-heading">
            <div>
              <h2 id="candidate-compare-title">선택 후보 비교</h2>
              <p>최대 4명까지 같은 기준으로 빠르게 비교합니다.</p>
            </div>
            <Link
              className="detail-text-link"
              href={buildEducationHref(params, { compare: null })}
            >
              비교 비우기
            </Link>
          </div>
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col">항목</th>
                  {compareCandidates.map((candidate) => (
                    <th key={candidate.id} scope="col">
                      {candidate.candidateName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">지역</th>
                  {compareCandidates.map((candidate) => (
                    <td key={candidate.id}>{candidateLocation(candidate)}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">공약 수</th>
                  {compareCandidates.map((candidate) => (
                    <td key={candidate.id}>{candidate.pledges.length}개</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">전과기록</th>
                  {compareCandidates.map((candidate) => (
                    <td key={candidate.id}>
                      <strong>{criminalRecordLabel(candidate.criminalRecord)}</strong>
                      <span className="compare-cell-note">
                        {criminalRecordDetail(candidate.criminalRecord)}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">정책축</th>
                  {compareCandidates.map((candidate) => {
                    const profile =
                      compareProfiles.get(candidate.id) ??
                      classifyEducationCandidate(candidate);
                    return (
                      <td key={candidate.id}>
                        {educationProfilePolicyAxes(profile) || "분류 전"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th scope="row">근거 키워드</th>
                  {compareCandidates.map((candidate) => {
                    const profile =
                      compareProfiles.get(candidate.id) ??
                      classifyEducationCandidate(candidate);
                    return (
                      <td key={candidate.id}>
                        {educationProfileEvidence(profile) || "근거 부족"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th scope="row">원문</th>
                  {compareCandidates.map((candidate) => {
                    const materialUrl = candidateMaterialUrl(candidate);
                    const electionBulletinUrl = candidateElectionBulletinUrl(candidate);
                    return (
                      <td key={candidate.id}>
                        {materialUrl ? (
                          <a href={materialUrl} rel="noreferrer" target="_blank">
                            5대공약
                          </a>
                        ) : (
                          "5대공약 없음"
                        )}
                        {electionBulletinUrl ? (
                          <>
                            {" / "}
                            <a
                              href={electionBulletinUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              선거공보
                            </a>
                          </>
                        ) : (
                          " / 선거공보 없음"
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          {compareCandidates.length === 1 ? (
            <p className="compare-hint">
              후보 카드에서 한 명을 더 추가하면 차이를 나란히 볼 수 있습니다.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="panel candidate-section">
        <div className="panel-heading candidate-heading">
          <div>
            <h2 id="candidate-list-title">
              {hasActiveFilters ? "검색 결과" : "후보자 목록"}
            </h2>
            <p>
              후보자 이름을 선택하면 상세 정보와 주요 공약을 확인할 수 있습니다.
            </p>
          </div>
          <span>
            {sortedCandidates.length.toLocaleString("ko-KR")}명 중{" "}
            {candidates.length.toLocaleString("ko-KR")}명 표시
          </span>
        </div>

        {candidates.length > 0 ? (
          <div className="candidate-list">
            {candidates.map((candidate) => {
              const materialUrl = candidateMaterialUrl(candidate);
              const electionBulletinUrl = candidateElectionBulletinUrl(candidate);
              const profile =
                candidateProfiles.get(candidate.id) ??
                classifyEducationCandidate(candidate);
              const evidence = educationProfileEvidence(profile);
              const policyAxes = educationProfilePolicyAxes(profile);
              const isCompared = compareIds.includes(candidate.id);
              const compareIsFull = compareIds.length >= 4 && !isCompared;
              const resultLabel = electionResultLabel(candidate);
              const voteRate =
                typeof candidate.result?.voteRate === "number"
                  ? formatVoteRate(candidate.result.voteRate)
                  : undefined;

              return (
                <article className="candidate-card" key={candidate.id}>
                  <div className="candidate-main">
                    <div className="candidate-title-row">
                      <Link
                        className="candidate-name"
                        href={`/candidates/${candidate.id}`}
                      >
                        {candidate.candidateName}
                      </Link>
                      {hasVisibleBallotNumber(candidate.ballotNumber) ? (
                        <span className="ballot-chip">
                          기호 {candidate.ballotNumber}
                        </span>
                      ) : null}
                      {resultLabel ? (
                        <span
                          className={`election-result-chip ${electionResultClass(candidate)}`}
                        >
                          {resultLabel}
                        </span>
                      ) : null}
                      <span
                        className={`orientation-chip ${profile.orientation.colorClass}`}
                      >
                        {profile.orientation.label}
                      </span>
                      <span
                        className={`criminal-record-chip ${criminalRecordClass(
                          candidate.criminalRecord
                        )}`}
                        title={criminalRecordDetail(candidate.criminalRecord)}
                      >
                        {criminalRecordLabel(candidate.criminalRecord)}
                      </span>
                    </div>
                    <div className="candidate-meta">
                      <span>{candidateLocation(candidate)}</span>
                      <span>{officeLabels[candidate.officeType]}</span>
                    </div>
                    <div className="candidate-submeta">
                      <span>{candidate.officeName}</span>
                      <span>
                        공약 {candidate.pledges.length.toLocaleString("ko-KR")}개
                      </span>
                      {voteRate ? <span>득표율 {voteRate}</span> : null}
                      <span>
                        {materialUrl ? "5대공약 자료 있음" : "5대공약 자료 없음"}
                      </span>
                    </div>
                    <div className="candidate-orientation-detail">
                      {policyAxes ? <span>정책축 {policyAxes}</span> : null}
                      {evidence ? <span>근거 {evidence}</span> : null}
                      {candidate.criminalRecord ? (
                        <span>
                          전과 공개자료 {criminalRecordDetail(candidate.criminalRecord)}
                        </span>
                      ) : null}
                    </div>
                    {profile.policyAxes.length > 0 ? (
                      <div
                        aria-label={`${candidate.candidateName} 정책축 필터`}
                        className="candidate-policy-tags"
                      >
                        {profile.policyAxes.slice(0, 3).map((axis) => (
                          <Link
                            className={`policy-axis-chip ${
                              policyAxisId === axis.id ? "active" : ""
                            }`}
                            href={buildEducationHref(params, {
                              page: 1,
                              policyAxis: axis.id
                            })}
                            key={axis.id}
                          >
                            {axis.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="candidate-actions">
                    {compareIsFull ? (
                      <span
                        aria-disabled="true"
                        className="action-button disabled"
                      >
                        최대 4명
                      </span>
                    ) : (
                      <Link
                        className={`action-button ${
                          isCompared ? "secondary" : "tertiary"
                        }`}
                        href={compareToggleHref({
                          candidateId: candidate.id,
                          compareIds,
                          params
                        })}
                      >
                        {isCompared ? "비교 해제" : "비교에 추가"}
                      </Link>
                    )}
                    <Link
                      className="action-button primary"
                      href={`/candidates/${candidate.id}#pledges`}
                    >
                      공약 보기
                    </Link>
                    {materialUrl ? (
                      <a
                        className="action-button secondary"
                        href={materialUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        5대공약 보기
                      </a>
                    ) : (
                      <span className="action-button disabled">5대공약 없음</span>
                    )}
                    {electionBulletinUrl ? (
                      <a
                        className="action-button tertiary"
                        href={electionBulletinUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        선거공보 보기
                      </a>
                    ) : (
                      <span className="action-button disabled">선거공보 없음</span>
                    )}
                    <Link
                      className="detail-text-link"
                      href={`/candidates/${candidate.id}`}
                    >
                      후보자 상세
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-result">
            <strong>조건에 맞는 후보자가 없습니다.</strong>
            <p>
              검색어를 줄이거나 지역/성향/정책축/전과/당선여부 조건을
              변경해보세요.
            </p>
            <div className="empty-actions">
              <Link className="action-button primary" href="/?election=education">
                전체 후보 보기
              </Link>
              <Link className="action-button secondary" href={relaxedHref}>
                조건 완화하기
              </Link>
              <Link
                className="action-button secondary"
                href="/analysis/education-wordcloud"
              >
                키워드 분석 보기
              </Link>
            </div>
          </div>
        )}

        {pagination.totalPages > 1 ? (
          <nav className="pagination" aria-label="후보자 목록 페이지">
            {pagination.page <= 1 ? (
              <span aria-disabled="true" className="pagination-disabled">
                이전
              </span>
            ) : (
              <Link href={buildEducationHref(params, { page: pagination.page - 1 })}>
                이전
              </Link>
            )}
            <span>
              {pagination.page.toLocaleString("ko-KR")} /{" "}
              {pagination.totalPages.toLocaleString("ko-KR")}
            </span>
            {pagination.page >= pagination.totalPages ? (
              <span aria-disabled="true" className="pagination-disabled">
                다음
              </span>
            ) : (
              <Link href={buildEducationHref(params, { page: pagination.page + 1 })}>
                다음
              </Link>
            )}
          </nav>
        ) : null}
      </section>

      {summary.totalCandidates > 1 ? (
        <details className="stats-disclosure">
          <summary>전체 통계 보기</summary>
          <section className="content-grid compact-stats" aria-label="후보자 통계">
            <article className="panel">
              <div className="panel-heading">
                <h2>선거 종류별 후보자</h2>
                <span>{summary.byOffice.length}개 분류</span>
              </div>
              <div className="office-list">
                {summary.byOffice.map((office) => (
                  <div className="office-row" key={office.officeType}>
                    <span>{office.label}</span>
                    <strong>{office.count.toLocaleString("ko-KR")}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <h2>지역별 후보자</h2>
                <span>{summary.byRegion.length}개 지역</span>
              </div>
              <div className="region-bars">
                {summary.byRegion.slice(0, 12).map((region) => (
                  <div className="region-row" key={region.regionName}>
                    <span>{region.regionName}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${
                            summary.totalCandidates > 0
                              ? (region.count / summary.totalCandidates) * 100
                              : 0
                          }%`
                        }}
                      />
                    </div>
                    <strong>{region.count}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </details>
      ) : null}
    </main>
  );
}
