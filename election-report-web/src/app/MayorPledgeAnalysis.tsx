"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";

import {
  hasHiddenItems,
  nextVisibleLimit,
  visibleItems
} from "../lib/incremental-rendering";
import {
  compareKeywordsByRelevance,
  tokenizePledgeText,
  type MayorKeyword,
  type MayorPledgeClientAnalysis,
  type MayorPledgeFilter,
  type MayorPledgeItem
} from "../lib/mayor-pledge-analysis";
import type { ElectionAnalysisCopy } from "../lib/election-tabs";

export type CandidateOption = {
  districtName?: string;
  id: string;
  label: string;
  partyName: string;
  regionName: string;
};

type MayorPledgeAnalysisProps = {
  analysis?: MayorPledgeClientAnalysis;
  analysisUrl?: string;
  copy?: ElectionAnalysisCopy;
  electionValue?: string;
  filters: MayorPledgeFilter;
  options: {
    candidates: CandidateOption[];
    districts: string[];
    parties: string[];
    regions: string[];
  };
};

const emptyAnalysis: MayorPledgeClientAnalysis = {
  candidateKeywords: [],
  keywords: [],
  pledgeItems: [],
  policyCategories: []
};

type WordStyle = CSSProperties & {
  "--word-size": string;
};

type RenderWindow = {
  limit: number;
  scope: string;
};

type LoadedAnalysis = {
  analysis: MayorPledgeClientAnalysis;
  analysisUrl: string;
};

type AnalysisError = {
  analysisUrl?: string;
  message: string;
};

const CANDIDATE_KEYWORD_INITIAL_LIMIT = 12;
const CANDIDATE_KEYWORD_STEP = 12;
const PLEDGE_INITIAL_LIMIT = 5;
const PLEDGE_STEP = 5;
const TOP_KEYWORD_RANK_LIMIT = 10;

const defaultCopy: ElectionAnalysisCopy = {
  emptyDescription: "지역이나 후보자 조건을 변경해보세요.",
  emptyTitle: "조건에 맞는 시장 후보 공약이 없습니다.",
  eyebrow: "시장 후보 공약",
  filterDescription:
    "후보자를 선택하지 않으면 조건에 맞는 전체 시장 후보 공약을 합산합니다.",
  lead: "지역별 시장 후보자의 주요 공약 키워드와 원문을 확인하세요.",
  title: "시장 공약 분석"
};

function keywordMatchesPledge(pledge: MayorPledgeItem, keyword: string) {
  return (
    pledge.keywords?.includes(keyword) ??
    tokenizePledgeText(pledge.pledgeText).includes(keyword)
  );
}

function snippetFor(pledge: MayorPledgeItem) {
  const text = pledge.pledgeText || pledge.pledgeSummary || pledge.pledgeTitle;
  return text.length > 170 ? `${text.slice(0, 170)}...` : text;
}

function fontSizeFor(keyword: MayorKeyword, maxCount: number) {
  const weight = keyword.score ?? keyword.pledgeCount ?? keyword.count;
  const ratio = maxCount > 0 ? weight / maxCount : 0;
  return 15 + Math.pow(ratio, 0.74) * 26;
}

function wordStyle(keyword: MayorKeyword, maxCount: number): WordStyle {
  return {
    "--word-size": `${fontSizeFor(keyword, maxCount).toFixed(1)}px`
  };
}

function selectedTitle(selectedKeyword: string | null) {
  return selectedKeyword ? `'${selectedKeyword}' 관련 공약` : "공약 목록";
}

function scopedLimit(window: RenderWindow, scope: string, initialLimit: number) {
  return window.scope === scope ? window.limit : initialLimit;
}

function maxKeywordCount(keywords: MayorKeyword[]) {
  return Math.max(
    1,
    ...keywords.map((keyword) => keyword.score ?? keyword.pledgeCount ?? keyword.count)
  );
}

function keywordEvidenceLabel(keyword: MayorKeyword) {
  return `${keyword.candidateCount.toLocaleString("ko-KR")}명 후보 · ${keyword.pledgeCount.toLocaleString("ko-KR")}개 공약`;
}

function uniqueSorted(values: Array<string | undefined>) {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value)))
  ].sort((left, right) => left.localeCompare(right, "ko"));
}

type MayorOptionFilters = Pick<
  MayorPledgeFilter,
  "candidateId" | "districtName" | "partyName" | "regionName"
>;

function matchesMayorOptionFilters(
  candidate: CandidateOption,
  filters: MayorOptionFilters
) {
  return (
    (!filters.candidateId || candidate.id === filters.candidateId) &&
    (!filters.regionName || candidate.regionName === filters.regionName) &&
    (!filters.districtName || candidate.districtName === filters.districtName) &&
    (!filters.partyName || candidate.partyName === filters.partyName)
  );
}

export function mayorRegionOptionsForFilters(
  candidates: CandidateOption[],
  filters: Pick<MayorOptionFilters, "candidateId" | "districtName" | "partyName">
) {
  return uniqueSorted(
    candidates
      .filter((candidate) =>
        matchesMayorOptionFilters(candidate, {
          candidateId: filters.candidateId,
          districtName: filters.districtName,
          partyName: filters.partyName
        })
      )
      .map((candidate) => candidate.regionName)
  );
}

export function mayorPartyOptionsForFilters(
  candidates: CandidateOption[],
  filters: Pick<MayorOptionFilters, "candidateId" | "districtName" | "regionName">
) {
  return uniqueSorted(
    candidates
      .filter((candidate) =>
        matchesMayorOptionFilters(candidate, {
          candidateId: filters.candidateId,
          districtName: filters.districtName,
          regionName: filters.regionName
        })
      )
      .map((candidate) => candidate.partyName)
  );
}

export function mayorDistrictOptionsForFilters(
  candidates: CandidateOption[],
  filters: Pick<MayorOptionFilters, "candidateId" | "partyName" | "regionName">
) {
  return uniqueSorted(
    candidates
      .filter((candidate) =>
        matchesMayorOptionFilters(candidate, {
          candidateId: filters.candidateId,
          partyName: filters.partyName,
          regionName: filters.regionName
        })
      )
      .map((candidate) => candidate.districtName)
  );
}

export function mayorPartyOptionsForRegion(
  candidates: CandidateOption[],
  regionName?: string,
  districtName?: string
) {
  return mayorPartyOptionsForFilters(candidates, { districtName, regionName });
}

export function mayorDistrictOptionsForRegion(
  candidates: CandidateOption[],
  regionName?: string
) {
  return mayorDistrictOptionsForFilters(candidates, { regionName });
}

export function filteredMayorCandidateOptions(
  candidates: CandidateOption[],
  filters: Pick<MayorPledgeFilter, "districtName" | "partyName" | "regionName">
) {
  return candidates.filter((candidate) =>
    matchesMayorOptionFilters(candidate, filters)
  );
}

export function MayorPledgeAnalysis({
  analysis: initialAnalysis,
  analysisUrl,
  copy = defaultCopy,
  electionValue = "mayor",
  filters,
  options
}: MayorPledgeAnalysisProps) {
  const [loadedAnalysis, setLoadedAnalysis] = useState<LoadedAnalysis>();
  const [analysisError, setAnalysisError] = useState<AnalysisError>();
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedRegionName, setSelectedRegionName] = useState(
    filters.regionName ?? ""
  );
  const [selectedDistrictName, setSelectedDistrictName] = useState(
    filters.districtName ?? ""
  );
  const [selectedPartyName, setSelectedPartyName] = useState(
    filters.partyName ?? ""
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    filters.candidateId ?? ""
  );
  const [candidateKeywordWindow, setCandidateKeywordWindow] = useState<RenderWindow>({
    limit: CANDIDATE_KEYWORD_INITIAL_LIMIT,
    scope: ""
  });
  const [pledgeWindow, setPledgeWindow] = useState<RenderWindow>({
    limit: PLEDGE_INITIAL_LIMIT,
    scope: ""
  });
  const loadedAnalysisForUrl =
    initialAnalysis ??
    (loadedAnalysis && loadedAnalysis.analysisUrl === analysisUrl
      ? loadedAnalysis.analysis
      : undefined);
  const missingAnalysisUrl = !initialAnalysis && !analysisUrl;
  const analysisErrorMessage = missingAnalysisUrl
    ? "Missing analysis endpoint."
    : analysisError && analysisError.analysisUrl === analysisUrl
      ? analysisError.message
      : undefined;
  const analysisState = loadedAnalysisForUrl
    ? "ready"
    : analysisErrorMessage
      ? "error"
      : "loading";
  const analysis = loadedAnalysisForUrl ?? emptyAnalysis;
  const showDistrictFilter = electionValue === "local-executive";
  const selectedCandidate = options.candidates.find(
    (candidate) => candidate.id === selectedCandidateId
  );
  const regionOptions = useMemo(() => {
    const regions = mayorRegionOptionsForFilters(options.candidates, {
      candidateId: selectedCandidate?.id,
      districtName: showDistrictFilter
        ? selectedDistrictName || undefined
        : undefined,
      partyName: selectedPartyName || undefined
    });

    return regions.length > 0 ||
      selectedCandidate ||
      selectedDistrictName ||
      selectedPartyName
      ? regions
      : options.regions;
  }, [
    options.candidates,
    options.regions,
    selectedCandidate,
    selectedDistrictName,
    selectedPartyName,
    showDistrictFilter
  ]);
  const activeRegionName =
    selectedCandidate?.regionName ??
    (regionOptions.includes(selectedRegionName) ? selectedRegionName : "");
  const districtOptions = useMemo(() => {
    const districts = mayorDistrictOptionsForFilters(options.candidates, {
      candidateId: selectedCandidate?.id,
      partyName: selectedPartyName || undefined,
      regionName: activeRegionName || undefined
    });

    return districts.length > 0 ||
      selectedCandidate ||
      activeRegionName ||
      selectedPartyName
      ? districts
      : options.districts;
  }, [
    activeRegionName,
    options.candidates,
    options.districts,
    selectedCandidate,
    selectedPartyName
  ]);
  const activeDistrictName =
    showDistrictFilter && selectedCandidate
      ? selectedCandidate.districtName ?? ""
      : showDistrictFilter && districtOptions.includes(selectedDistrictName)
        ? selectedDistrictName
        : "";
  const partyOptions = useMemo(() => {
    const parties = mayorPartyOptionsForFilters(options.candidates, {
      candidateId: selectedCandidate?.id,
      districtName: activeDistrictName || undefined,
      regionName: activeRegionName || undefined
    });

    return parties.length > 0 ||
      selectedCandidate ||
      activeRegionName ||
      activeDistrictName
      ? parties
      : options.parties;
  }, [
    activeDistrictName,
    activeRegionName,
    options.candidates,
    options.parties,
    selectedCandidate
  ]);
  const activePartyName =
    selectedCandidate?.partyName ??
    (partyOptions.includes(selectedPartyName) ? selectedPartyName : "");
  const candidateOptions = useMemo(
    () =>
      filteredMayorCandidateOptions(options.candidates, {
        districtName: activeDistrictName || undefined,
        partyName: activePartyName || undefined,
        regionName: activeRegionName || undefined
      }),
    [activeDistrictName, activePartyName, activeRegionName, options.candidates]
  );
  const activeCandidateId = candidateOptions.some(
    (candidate) => candidate.id === selectedCandidateId
  )
    ? selectedCandidateId
    : "";

  useEffect(() => {
    if (initialAnalysis || !analysisUrl) {
      return;
    }

    const controller = new AbortController();

    fetch(analysisUrl, {
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Analysis request failed: ${response.status}`);
        }

        return (await response.json()) as {
          analysis: MayorPledgeClientAnalysis;
        };
      })
      .then((payload) => {
        setLoadedAnalysis({
          analysis: payload.analysis,
          analysisUrl
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAnalysisError({
          analysisUrl,
          message:
            error instanceof Error ? error.message : "Analysis request failed."
        });
      });

    return () => controller.abort();
  }, [analysisUrl, initialAnalysis]);

  const rankedKeywords = useMemo(
    () => [...analysis.keywords].sort(compareKeywordsByRelevance),
    [analysis.keywords]
  );
  const topKeywords = rankedKeywords.slice(0, TOP_KEYWORD_RANK_LIMIT);
  const cloudKeywords = rankedKeywords.slice(0, 34);
  const maxCount = maxKeywordCount(cloudKeywords);
  const visiblePledges = useMemo(
    () =>
      selectedKeyword
        ? analysis.pledgeItems.filter((pledge) =>
            keywordMatchesPledge(pledge, selectedKeyword)
          )
        : analysis.pledgeItems,
    [analysis.pledgeItems, selectedKeyword]
  );
  const hasFilters = Boolean(
    filters.regionName ||
      filters.districtName ||
      filters.partyName ||
      filters.candidateId ||
      filters.query
  );
  const hasAnalysisText = analysis.pledgeItems.length > 0;
  const hasEnoughKeywords = cloudKeywords.length > 0;
  const firstCandidateKeywordId = analysis.candidateKeywords[0]?.candidateId ?? "";
  const lastCandidateKeywordId =
    analysis.candidateKeywords.at(-1)?.candidateId ?? "";
  const candidateKeywordScope = `${analysis.candidateKeywords.length}:${firstCandidateKeywordId}:${lastCandidateKeywordId}`;
  const firstPledgeId = visiblePledges[0]?.id ?? "";
  const lastPledgeId = visiblePledges.at(-1)?.id ?? "";
  const pledgeScope = `${selectedKeyword ?? "all"}:${visiblePledges.length}:${firstPledgeId}:${lastPledgeId}`;
  const candidateKeywordLimit = scopedLimit(
    candidateKeywordWindow,
    candidateKeywordScope,
    CANDIDATE_KEYWORD_INITIAL_LIMIT
  );
  const pledgeLimit = scopedLimit(pledgeWindow, pledgeScope, PLEDGE_INITIAL_LIMIT);
  const renderedCandidateKeywords = useMemo(
    () => visibleItems(analysis.candidateKeywords, candidateKeywordLimit),
    [analysis.candidateKeywords, candidateKeywordLimit]
  );
  const renderedPledges = useMemo(
    () => visibleItems(visiblePledges, pledgeLimit),
    [visiblePledges, pledgeLimit]
  );
  const hasMoreCandidateKeywords = hasHiddenItems({
    total: analysis.candidateKeywords.length,
    visible: renderedCandidateKeywords.length
  });
  const hasMorePledges = hasHiddenItems({
    total: visiblePledges.length,
    visible: renderedPledges.length
  });

  function activateKeyword(keyword: string) {
    setSelectedKeyword((current) => (current === keyword ? null : keyword));
  }

  function selectRegion(regionName: string) {
    setSelectedRegionName(regionName);
    setSelectedDistrictName("");
    setSelectedCandidateId("");
    setSelectedPartyName((currentPartyName) => {
      if (!currentPartyName) {
        return "";
      }

      return mayorPartyOptionsForRegion(options.candidates, regionName).includes(
        currentPartyName
      )
        ? currentPartyName
        : "";
    });
  }

  function selectDistrict(districtName: string) {
    setSelectedDistrictName(districtName);
    setSelectedCandidateId("");
    setSelectedPartyName((currentPartyName) => {
      if (!currentPartyName) {
        return "";
      }

      return mayorPartyOptionsForRegion(
        options.candidates,
        activeRegionName,
        districtName
      ).includes(currentPartyName)
        ? currentPartyName
        : "";
    });
  }

  function selectParty(partyName: string) {
    setSelectedPartyName(partyName);
    setSelectedCandidateId("");
    setSelectedRegionName((currentRegionName) => {
      if (!currentRegionName || !partyName) {
        return currentRegionName;
      }

      return mayorRegionOptionsForFilters(options.candidates, { partyName }).includes(
        currentRegionName
      )
        ? currentRegionName
        : "";
    });
    setSelectedDistrictName((currentDistrictName) => {
      if (!currentDistrictName || !partyName) {
        return currentDistrictName;
      }

      return mayorDistrictOptionsForFilters(options.candidates, {
        partyName,
        regionName: activeRegionName || undefined
      }).includes(currentDistrictName)
        ? currentDistrictName
        : "";
    });
  }

  function selectCandidate(candidateId: string) {
    setSelectedCandidateId(candidateId);

    const candidate = options.candidates.find((option) => option.id === candidateId);

    if (!candidate) {
      return;
    }

    setSelectedRegionName(candidate.regionName);
    setSelectedDistrictName(showDistrictFilter ? (candidate.districtName ?? "") : "");
    setSelectedPartyName(candidate.partyName);
  }

  function showMoreCandidateKeywords() {
    setCandidateKeywordWindow((currentWindow) => {
      const current = scopedLimit(
        currentWindow,
        candidateKeywordScope,
        CANDIDATE_KEYWORD_INITIAL_LIMIT
      );

      return {
        limit: nextVisibleLimit({
          current,
          step: CANDIDATE_KEYWORD_STEP,
          total: analysis.candidateKeywords.length
        }),
        scope: candidateKeywordScope
      };
    });
  }

  function showMorePledges() {
    setPledgeWindow((currentWindow) => {
      const current = scopedLimit(currentWindow, pledgeScope, PLEDGE_INITIAL_LIMIT);

      return {
        limit: nextVisibleLimit({
          current,
          step: PLEDGE_STEP,
          total: visiblePledges.length
        }),
        scope: pledgeScope
      };
    });
  }

  return (
    <section className="mayor-analysis" aria-labelledby="mayor-analysis-title">
      <div className="mayor-analysis-header">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 id="mayor-analysis-title">{copy.title}</h1>
        <p className="lead">{copy.lead}</p>
      </div>

      <section className="panel filter-panel search-panel">
        <div className="search-panel-heading">
          <div>
            <h2>분석 조건</h2>
            <p>{copy.filterDescription}</p>
          </div>
        </div>
        <form
          className={`filter-form mayor-filter-form ${
            showDistrictFilter ? "has-district-filter" : ""
          }`}
        >
          <input name="election" type="hidden" value={electionValue} />
          <label>
            <span>지역 선택</span>
            <select
              name="region"
              onChange={(event) => selectRegion(event.target.value)}
              value={activeRegionName}
            >
              <option value="">전체 지역</option>
              {regionOptions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
          {showDistrictFilter ? (
            <label>
              <span>세부지역 선택</span>
              <select
                name="district"
                onChange={(event) => selectDistrict(event.target.value)}
                value={activeDistrictName}
              >
                <option value="">전체 시·군·구</option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span>정당 선택</span>
            <select
              name="party"
              onChange={(event) => selectParty(event.target.value)}
              value={activePartyName}
            >
              <option value="">전체 정당</option>
              {partyOptions.map((party) => (
                <option key={party} value={party}>
                  {party}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>후보자 선택</span>
            <select
              name="candidate"
              onChange={(event) => selectCandidate(event.target.value)}
              value={activeCandidateId}
            >
              <option value="">전체 후보 합산</option>
              {candidateOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>검색어 입력</span>
            <input
              defaultValue={filters.query ?? ""}
              name="q"
              placeholder="예: 교통, 일자리, 돌봄"
              type="search"
            />
          </label>
          <div className="filter-actions">
            <button type="submit">검색</button>
            {hasFilters || selectedKeyword ? (
              <Link
                href={`/?election=${electionValue}`}
                onClick={() => setSelectedKeyword(null)}
              >
                초기화
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {analysisState === "loading" ? (
        <div
          className="state-panel mayor-analysis-loading"
          data-analysis-state="loading"
        >
          <strong>분석을 불러오는 중입니다.</strong>
          <p>후보 공약 분석은 초기 화면과 분리해서 불러옵니다.</p>
        </div>
      ) : analysisState === "error" ? (
        <div className="empty-result mayor-empty-state" data-analysis-state="error">
          <strong>분석을 불러오지 못했습니다.</strong>
          <p>{analysisErrorMessage ?? "잠시 후 다시 시도해 주세요."}</p>
        </div>
      ) : !hasAnalysisText ? (
        <div className="empty-result mayor-empty-state">
          <strong>{copy.emptyTitle}</strong>
          <p>{copy.emptyDescription}</p>
        </div>
      ) : (
        <>
          <section className="mayor-cloud-grid" aria-label="주요 공약 키워드">
            <div className="mayor-wordcloud-panel">
              <div className="mayor-section-heading">
                <div>
                  <h2>주요 공약 키워드</h2>
                </div>
                {selectedKeyword ? (
                  <button
                    className="text-reset-button"
                    onClick={() => setSelectedKeyword(null)}
                    type="button"
                  >
                    전체 보기
                  </button>
                ) : null}
              </div>

              {hasEnoughKeywords ? (
                <>
                  <div className="mayor-wordcloud-stage" aria-live="polite">
                    {cloudKeywords.map((keyword) => (
                      <button
                        className={`mayor-cloud-word ${
                          selectedKeyword === keyword.keyword ? "selected" : ""
                        }`}
                        key={keyword.keyword}
                        onClick={() => activateKeyword(keyword.keyword)}
                        style={wordStyle(keyword, maxCount)}
                        title={keywordEvidenceLabel(keyword)}
                        type="button"
                      >
                        <span>{keyword.keyword}</span>
                        <em>{keyword.pledgeCount.toLocaleString("ko-KR")}개</em>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="state-panel">
                  <p>분석할 수 있는 공약 문장이 충분하지 않습니다.</p>
                </div>
              )}
            </div>

            <aside
              className="mayor-keyword-panel"
              aria-label={`주요 키워드 TOP ${TOP_KEYWORD_RANK_LIMIT}`}
            >
              <div className="mayor-section-heading compact">
                <h2>주요 키워드 TOP {TOP_KEYWORD_RANK_LIMIT}</h2>
              </div>
              <div className="keyword-rank-list" role="list">
                {topKeywords.map((keyword, index) => (
                  <button
                    className={`keyword-rank-row ${
                      selectedKeyword === keyword.keyword ? "selected" : ""
                    }`}
                    key={keyword.keyword}
                    onClick={() => activateKeyword(keyword.keyword)}
                    role="listitem"
                    type="button"
                  >
                    <span>{index + 1}</span>
                    <strong>{keyword.keyword}</strong>
                    <em>{keywordEvidenceLabel(keyword)}</em>
                  </button>
                ))}
              </div>
            </aside>
          </section>

          <section className="candidate-keyword-section">
            <div className="mayor-section-heading">
              <div>
                <h2>후보별 특징 키워드</h2>
                <p>전체 후보 대비 해당 후보 공약에서 두드러지는 대표 구문입니다.</p>
              </div>
            </div>
            {analysis.candidateKeywords.length > 0 ? (
              <>
                <div className="candidate-keyword-list">
                  {renderedCandidateKeywords.map((candidate) => (
                    <div className="candidate-keyword-row" key={candidate.candidateId}>
                      <div>
                        <strong>{candidate.candidateName}</strong>
                        <span>
                          {candidate.partyName} · {candidate.regionName}
                        </span>
                      </div>
                      <div className="keyword-badge-list">
                        {candidate.keywords.map((keyword) => (
                          <button
                            className={selectedKeyword === keyword ? "selected" : ""}
                            key={`${candidate.candidateId}-${keyword}`}
                            onClick={() => activateKeyword(keyword)}
                            type="button"
                          >
                            {keyword}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {hasMoreCandidateKeywords ? (
                  <div className="incremental-load-more">
                    <button onClick={showMoreCandidateKeywords} type="button">
                      후보별 특징 더보기
                      <span>
                        {renderedCandidateKeywords.length.toLocaleString("ko-KR")} /{" "}
                        {analysis.candidateKeywords.length.toLocaleString("ko-KR")}명
                      </span>
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="empty-copy">후보별로 비교할 수 있는 키워드가 없습니다.</p>
            )}
          </section>

          {analysis.policyCategories.length > 0 ? (
            <section className="policy-category-strip" aria-label="정책 분야 보조 분류">
              <div className="mayor-section-heading compact">
                <h2>정책 분야 보조 분류</h2>
                <p>키워드 기반 간단 분류이므로 참고용으로만 제공합니다.</p>
              </div>
              <div className="policy-category-list">
                {analysis.policyCategories.slice(0, 6).map((category) => (
                  <div className="policy-category-row" key={category.category}>
                    <strong>{category.category}</strong>
                    <span>{category.count.toLocaleString("ko-KR")}회</span>
                    <em>{category.keywords.join(", ")}</em>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mayor-pledge-results" aria-live="polite">
            <div className="mayor-section-heading">
              <div>
                <h2>{selectedTitle(selectedKeyword)}</h2>
                <p>
                  {renderedPledges.length.toLocaleString("ko-KR")} /{" "}
                  {visiblePledges.length.toLocaleString("ko-KR")}개 공약을 표시합니다.
                </p>
              </div>
              {selectedKeyword ? (
                <button
                  className="text-reset-button"
                  onClick={() => setSelectedKeyword(null)}
                  type="button"
                >
                  전체 보기
                </button>
              ) : null}
            </div>

            {visiblePledges.length > 0 ? (
              <>
                <div className="mayor-pledge-list">
                  {renderedPledges.map((pledge) => (
                    <article className="mayor-pledge-row" key={pledge.id}>
                      <div className="mayor-pledge-copy">
                        <div className="candidate-meta">
                          <span>{pledge.candidateName}</span>
                          <span>{pledge.partyName}</span>
                          <span>{pledge.regionName}</span>
                          <span>{pledge.electionName}</span>
                        </div>
                        <h3>{pledge.pledgeTitle || pledge.pledgeSummary}</h3>
                        {pledge.pledgeSummary ? <p>{pledge.pledgeSummary}</p> : null}
                        <small>{snippetFor(pledge)}</small>
                      </div>
                      <div className="mayor-pledge-actions">
                        {pledge.materialUrl ? (
                          <a
                            className="action-button secondary"
                            href={pledge.materialUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            5대공약 보기
                          </a>
                        ) : (
                          <span className="action-button disabled">
                            5대공약 없음
                          </span>
                        )}
                        {pledge.electionBulletinUrl ? (
                          <a
                            className="action-button tertiary"
                            href={pledge.electionBulletinUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            선거공보 보기
                          </a>
                        ) : (
                          <span className="action-button disabled">
                            선거공보 없음
                          </span>
                        )}
                        <Link
                          className="action-button primary"
                          href={`/candidates/${pledge.candidateId}`}
                        >
                          후보자 상세 보기
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
                {hasMorePledges ? (
                  <div className="incremental-load-more">
                    <button onClick={showMorePledges} type="button">
                      공약 더보기
                      <span>
                        {renderedPledges.length.toLocaleString("ko-KR")} /{" "}
                        {visiblePledges.length.toLocaleString("ko-KR")}개
                      </span>
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-result">
                <strong>선택한 키워드와 연결된 공약이 없습니다.</strong>
                <p>전체 보기로 돌아가거나 다른 키워드를 선택해보세요.</p>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
