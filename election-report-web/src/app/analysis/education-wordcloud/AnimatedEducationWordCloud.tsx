"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent
} from "react";
import cloud from "d3-cloud";
import Link from "next/link";

export type CloudWord = {
  text: string;
  count: number;
  candidateCount?: number;
  candidateRate?: number;
  detail?: string;
};

export type CloudDataset = {
  id: "details" | "categories" | "phrases";
  label: string;
  words: CloudWord[];
};

type AnimatedEducationWordCloudProps = {
  datasets: CloudDataset[];
  generatedAt: string;
  materialCount: number;
  pageCount: number;
};

type PointerPosition = {
  x: number;
  y: number;
};

type PixelPosition = {
  x: number;
  y: number;
};

type CloudWordStyle = CSSProperties & {
  transform: string;
};

type TooltipStyle = CSSProperties & {
  "--tooltip-x": string;
  "--tooltip-y": string;
  "--tooltip-shift": string;
};

type LayoutWord = CloudWord & {
  bubbleRadius?: number;
  colorRatio: number;
  originalIndex: number;
  size: number;
  rotate: number;
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
};

type LayoutDatum = CloudWord & {
  colorRatio: number;
  originalIndex: number;
  size: number;
  rotate?: number;
  x?: number;
  y?: number;
};

type TooltipState = {
  word: LayoutWord;
  position: PixelPosition;
  placement: TooltipPlacement;
};

type TooltipPlacement = "bottom" | "top";

type StageSize = {
  width: number;
  height: number;
};

type SortMode = "count" | "candidateRate" | "candidateCount";

const defaultStageSize = {
  width: 820,
  height: 500
};

const datasetSubtexts: Record<CloudDataset["id"], string> = {
  details: "빈도와 후보자 언급률을 함께 비교",
  categories: "정책 분야별 묶음과 대표 용어",
  phrases: "반복해서 등장한 공통 표현"
};

const excludedTerms = ["교육", "학교", "학생", "지원", "확대", "운영", "강화", "지역"];

function displayRate(value: number | undefined) {
  if (value === undefined) {
    return null;
  }

  return `${Math.round(value * 100)}%`;
}

function visibleLimit(datasetId: CloudDataset["id"], stageWidth: number) {
  if (datasetId === "categories") {
    return 8;
  }

  if (datasetId === "phrases") {
    return stageWidth < 560 ? 16 : 28;
  }

  return stageWidth < 560 ? 18 : 30;
}

function fontSizeFor(
  datasetId: CloudDataset["id"],
  word: CloudWord,
  maxCount: number,
  stageWidth: number
) {
  const ratio = maxCount > 0 ? word.count / maxCount : 0;
  const responsiveScale = stageWidth < 560 ? 0.66 : stageWidth < 900 ? 0.84 : 1;

  if (datasetId === "phrases") {
    return Math.max(14, (14 + Math.pow(ratio, 1.2) * 44) * responsiveScale);
  }

  if (datasetId === "categories") {
    return Math.max(14, (18 + Math.pow(ratio, 1.05) * 24) * responsiveScale);
  }

  return Math.max(14, (15 + Math.pow(ratio, 1.24) * 66) * responsiveScale);
}

function categoryBubbleRadius(
  word: CloudWord,
  minCount: number,
  maxCount: number,
  stageWidth: number
) {
  const range = Math.max(1, maxCount - minCount);
  const ratio = (word.count - minCount) / range;
  const minRadius = stageWidth < 560 ? 38 : 64;
  const maxRadius = stageWidth < 560 ? 56 : 92;

  return minRadius + Math.sqrt(ratio) * (maxRadius - minRadius);
}

function paddingFor(datasetId: CloudDataset["id"], word: LayoutDatum) {
  if (datasetId === "categories") {
    return Math.max(8, Math.min(14, word.size * 0.12));
  }

  if (datasetId === "phrases") {
    return Math.max(10, Math.min(20, word.size * 0.18));
  }

  return Math.max(22, Math.min(52, word.size * 0.35));
}

function rotationFor() {
  return 0;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number) {
  let value = seed;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function centeredCloudRandom(seed: number) {
  const nextDirection = seededRandom(seed);
  let callIndex = 0;

  return () => {
    const phase = callIndex % 3;
    callIndex += 1;

    // d3-cloud calls random for x, y, and spiral direction. Center x/y.
    return phase < 2 ? 0.5 : nextDirection();
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function colorForRatio(ratio: number) {
  const value = clamp(ratio, 0, 1);

  if (value >= 0.75) {
    return "#0f172a";
  }

  if (value >= 0.5) {
    return "#2563eb";
  }

  return "#60a5fa";
}

function colorValueFor(datasetId: CloudDataset["id"], word: CloudWord) {
  if (datasetId === "details" && word.candidateRate !== undefined) {
    return word.candidateRate;
  }

  return word.count;
}

function colorDomain(datasetId: CloudDataset["id"], words: CloudWord[]) {
  if (datasetId === "details") {
    return { min: 0, max: 1 };
  }

  const values = words.map((word) => colorValueFor(datasetId, word));
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { min, max };
}

function colorRatioFor(
  datasetId: CloudDataset["id"],
  word: CloudWord,
  domain: { min: number; max: number }
) {
  const range = domain.max - domain.min;

  if (range <= 0) {
    return 1;
  }

  return clamp((colorValueFor(datasetId, word) - domain.min) / range, 0, 1);
}

function magnification(
  pointer: PointerPosition | null,
  x: number,
  y: number,
  datasetId: CloudDataset["id"]
) {
  if (!pointer) {
    return 1;
  }

  const dx = (pointer.x - x) * 1.35;
  const dy = pointer.y - y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const radius = datasetId === "categories" ? 25 : 14;
  const proximity = Math.max(0, 1 - distance / radius);

  if (datasetId === "categories") {
    return 1 + proximity * proximity * 0.06;
  }

  return 1 + proximity * proximity * 0.18;
}

function wordStyle(
  datasetId: CloudDataset["id"],
  word: LayoutWord,
  pointer: PointerPosition | null
) {
  const scale = magnification(pointer, word.xPercent, word.yPercent, datasetId);

  return {
    transform: `scale(${scale.toFixed(3)})`
  } satisfies CloudWordStyle;
}

function wordTransform(word: LayoutWord) {
  return `translate(${word.x.toFixed(1)} ${word.y.toFixed(1)}) rotate(${
    word.rotate
  })`;
}

function categoryBubbleTransform(
  word: LayoutWord,
  pointer: PointerPosition | null
) {
  const scale = magnification(pointer, word.xPercent, word.yPercent, "categories");

  return `translate(${word.x.toFixed(1)} ${word.y.toFixed(
    1
  )}) scale(${scale.toFixed(3)})`;
}

function stagePosition(
  stage: HTMLDivElement | null,
  clientX: number,
  clientY: number
) {
  if (!stage) {
    return null;
  }

  const rect = stage.getBoundingClientRect();

  return {
    percent: {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100
    },
    pixel: {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  };
}

function normalizeLayoutWord(
  word: LayoutDatum,
  width: number,
  height: number
): LayoutWord {
  const x = word.x ?? 0;
  const y = word.y ?? 0;

  return {
    ...word,
    rotate: word.rotate ?? 0,
    x: x + width / 2,
    y: y + height / 2,
    xPercent: ((x + width / 2) / width) * 100,
    yPercent: ((y + height / 2) / height) * 100
  };
}

function buildCategoryLayoutWords(
  words: CloudWord[],
  stageSize: StageSize
): LayoutWord[] {
  const positions =
    stageSize.width < 560
      ? [
          [35, 22],
          [65, 22],
          [35, 44],
          [65, 44],
          [35, 66],
          [65, 66],
          [35, 87],
          [65, 87]
        ]
      : [
          [50, 50],
          [31, 43],
          [69, 43],
          [41, 76],
          [59, 76],
          [22, 64],
          [78, 64],
          [50, 20]
        ];
  const domain = colorDomain("categories", words);
  const minCount = Math.min(...words.map((word) => word.count));
  const maxCount = Math.max(...words.map((word) => word.count));

  return words.map((word, index) => {
    const [xPercent, yPercent] = positions[index % positions.length];
    const bubbleRadius = categoryBubbleRadius(
      word,
      minCount,
      maxCount,
      stageSize.width
    );

    return {
      ...word,
      bubbleRadius,
      colorRatio: colorRatioFor("categories", word, domain),
      originalIndex: index,
      rotate: 0,
      size: clamp(
        bubbleRadius * 0.26,
        stageSize.width < 560 ? 14 : 17,
        stageSize.width < 560 ? 18 : 28
      ),
      x: (stageSize.width * xPercent) / 100,
      y: (stageSize.height * yPercent) / 100,
      xPercent,
      yPercent
    };
  });
}

function splitCategoryLabel(text: string) {
  return text.split("·");
}

function tooltipText(word: LayoutWord) {
  if (word.candidateRate !== undefined) {
    return `후보자 언급률 ${displayRate(word.candidateRate)}`;
  }

  return word.detail ?? null;
}

function tooltipStyle(tooltip: TooltipState): TooltipStyle {
  return {
    "--tooltip-x": `${tooltip.position.x.toFixed(1)}px`,
    "--tooltip-y": `${tooltip.position.y.toFixed(1)}px`,
    "--tooltip-shift":
      tooltip.placement === "bottom"
        ? "translate(-50%, 16px)"
        : "translate(-50%, calc(-100% - 16px))"
  };
}

function tooltipStateForTarget(
  word: LayoutWord,
  target: Element,
  stage: HTMLDivElement | null
): TooltipState | null {
  if (!stage) {
    return null;
  }

  const stageRect = stage.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const placement = targetRect.bottom + 116 > stageRect.bottom ? "top" : "bottom";

  return {
    word,
    placement,
    position: {
      x: clamp(
        targetRect.left + targetRect.width / 2 - stageRect.left,
        20,
        stageRect.width - 20
      ),
      y:
        placement === "bottom"
          ? targetRect.bottom - stageRect.top
          : targetRect.top - stageRect.top
    }
  };
}

function wordAriaLabel(word: LayoutWord | CloudWord) {
  const parts = [
    word.text,
    `빈도 ${word.count.toLocaleString("ko-KR")}회`
  ];

  if (word.candidateCount !== undefined) {
    parts.push(`언급 후보자 ${word.candidateCount.toLocaleString("ko-KR")}명`);
  }

  if (word.candidateRate !== undefined) {
    parts.push(`후보자 언급률 ${displayRate(word.candidateRate)}`);
  }

  if (word.detail) {
    parts.push(word.detail);
  }

  return parts.join(", ");
}

function sortWords(words: CloudWord[], sortMode: SortMode) {
  return [...words].sort((left, right) => {
    if (sortMode === "candidateRate") {
      return (
        (right.candidateRate ?? -1) - (left.candidateRate ?? -1) ||
        right.count - left.count
      );
    }

    if (sortMode === "candidateCount") {
      return (
        (right.candidateCount ?? -1) - (left.candidateCount ?? -1) ||
        right.count - left.count
      );
    }

    return right.count - left.count;
  });
}

function matchesQuery(word: CloudWord, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return `${word.text} ${word.detail ?? ""}`.toLowerCase().includes(normalized);
}

function tableColumnLabels(datasetId: CloudDataset["id"]) {
  if (datasetId === "details") {
    return ["순위", "키워드", "전체 빈도", "언급 후보자", "후보자 언급률"];
  }

  if (datasetId === "categories") {
    return ["순위", "정책 분야", "전체 빈도", "언급 후보자", "대표 키워드"];
  }

  return ["순위", "공통 반복 문구", "전체 빈도", "언급 후보자", "상세"];
}

export function AnimatedEducationWordCloud({
  datasets,
  generatedAt,
  materialCount,
  pageCount
}: AnimatedEducationWordCloudProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState<StageSize>(defaultStageSize);
  const [activeId, setActiveId] = useState<CloudDataset["id"]>("details");
  const [pointer, setPointer] = useState<PointerPosition | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("count");
  const [hoveredWordText, setHoveredWordText] = useState<string | null>(null);
  const [selectedWordText, setSelectedWordText] = useState<string | null>(null);
  const [isCloudOpen, setIsCloudOpen] = useState(true);
  const activeDataset =
    datasets.find((dataset) => dataset.id === activeId) ?? datasets[0];
  const highlightedWordText = hoveredWordText ?? selectedWordText;
  const summaryWords = datasets.find((dataset) => dataset.id === "details")?.words ?? [];
  const topSummaryWords = summaryWords.slice(0, 5);
  const filteredWords = useMemo(
    () =>
      sortWords(
        activeDataset.words.filter((word) => matchesQuery(word, query)),
        sortMode
      ),
    [activeDataset.words, query, sortMode]
  );
  const visibleWords = useMemo(
    () => filteredWords.slice(0, visibleLimit(activeDataset.id, stageSize.width)),
    [activeDataset.id, filteredWords, stageSize.width]
  );
  const tableRows = filteredWords.slice(0, 14);
  const maxCount = visibleWords[0]?.count ?? 1;
  const layoutKey = useMemo(
    () =>
      `${activeDataset.id}:${Math.round(stageSize.width)}x${Math.round(
        stageSize.height
      )}:${visibleWords
        .map((word) => `${word.text}:${word.count}`)
        .join("|")}`,
    [activeDataset.id, stageSize.height, stageSize.width, visibleWords]
  );
  const [layoutState, setLayoutState] = useState<{
    key: string;
    words: LayoutWord[];
  } | null>(null);
  const categoryLayoutWords = useMemo(
    () =>
      activeDataset.id === "categories"
        ? buildCategoryLayoutWords(visibleWords, stageSize)
        : [],
    [activeDataset.id, stageSize, visibleWords]
  );
  const layoutWords =
    activeDataset.id === "categories"
      ? categoryLayoutWords
      : layoutState?.key === layoutKey
        ? layoutState.words
        : [];
  const [rankLabel, keywordLabel, countLabel, candidateLabel, detailLabel] =
    tableColumnLabels(activeDataset.id);
  const tableSummary = query.trim()
    ? `검색 결과 ${filteredWords.length.toLocaleString("ko-KR")}개 중 상위 ${tableRows.length.toLocaleString("ko-KR")}개`
    : `전체 ${activeDataset.words.length.toLocaleString("ko-KR")}개 중 상위 ${tableRows.length.toLocaleString("ko-KR")}개`;
  const legendLabel =
    activeDataset.id === "details"
      ? "크기: 언급 빈도 · 색: 후보자 언급률"
      : "크기: 언급 빈도 · 색: 빈도 구간";

  function updateTooltip(word: LayoutWord, target: Element) {
    const nextTooltip = tooltipStateForTarget(word, target, stageRef.current);

    if (nextTooltip) {
      setTooltip(nextTooltip);
    }
  }

  function activateWord(wordText: string) {
    setSelectedWordText((current) => (current === wordText ? null : wordText));
  }

  function handleWordKeyDown(
    event: KeyboardEvent<SVGGElement>,
    wordText: string
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    activateWord(wordText);
  }

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const next = {
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height)
      };

      if (next.width <= 0 || next.height <= 0) {
        return;
      }

      setStageSize((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : next
      );
    });

    observer.observe(stage);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    function syncCloudDisclosure() {
      setIsCloudOpen(window.innerWidth > 560);
    }

    syncCloudDisclosure();
    window.addEventListener("resize", syncCloudDisclosure);

    return () => {
      window.removeEventListener("resize", syncCloudDisclosure);
    };
  }, []);

  useEffect(() => {
    if (visibleWords.length === 0 || activeDataset.id === "categories") {
      return;
    }

    const width = Math.max(320, stageSize.width);
    const height = Math.max(360, stageSize.height);
    const seed = hashString(layoutKey);
    const domain = colorDomain(activeDataset.id, visibleWords);
    const layoutInput = visibleWords.map((word, index) => ({
      ...word,
      colorRatio: colorRatioFor(activeDataset.id, word, domain),
      originalIndex: index,
      size: fontSizeFor(activeDataset.id, word, maxCount, stageSize.width),
      rotate: rotationFor()
    }));
    const layout = cloud<LayoutDatum>()
      .size([width, height])
      .words(layoutInput)
      .padding((word) => paddingFor(activeDataset.id, word))
      .rotate((word) => word.rotate ?? 0)
      .font("Malgun Gothic")
      .fontSize((word) => word.size)
      .fontWeight(900)
      .random(centeredCloudRandom(seed))
      .spiral("archimedean")
      .on("end", (words) => {
        setLayoutState({
          key: layoutKey,
          words: words
            .map((word) => normalizeLayoutWord(word, width, height))
            .sort((left, right) => left.originalIndex - right.originalIndex)
        });
      });

    layout.start();

    return () => {
      layout.stop();
    };
  }, [
    activeDataset.id,
    layoutKey,
    maxCount,
    stageSize.height,
    stageSize.width,
    visibleWords
  ]);

  return (
    <section className="live-cloud-panel" aria-label="교육감 5대공약 키워드 분석">
      <a className="skip-cloud-link" href="#keyword-table">
        시각 자료 건너뛰고 표로 가기
      </a>

      <div className="cloud-toolbar">
        <div>
          <p className="eyebrow">교육감 5대공약</p>
          <h1>교육감 공약 핵심 키워드 분석</h1>
          <p className="lead">
            교육감 후보 58명의 5대공약({pageCount.toLocaleString("ko-KR")}쪽)에서
            어떤 정책 의제가 가장 자주 등장하고, 얼마나 많은 후보가 언급했는지
            비교합니다. 클수록 자주, 진할수록 많은 후보가 언급했습니다.
          </p>
        </div>
        <div className="cloud-actions" aria-label="주요 작업">
          <a className="primary-cloud-action" href="/analysis/education-wordcloud/downloads/pdf-links">
            원본 공약 PDF 목록 다운로드
            <span>{materialCount.toLocaleString("ko-KR")}건 · {pageCount.toLocaleString("ko-KR")}쪽</span>
          </a>
          <Link className="secondary-cloud-action" href="/?office=education_superintendent">
            후보자별 보기
          </Link>
        </div>
      </div>

      <div className="cloud-summary-strip" aria-label="상위 키워드 요약">
        {topSummaryWords.map((word, index) => (
          <button
            className={`cloud-summary-card ${
              selectedWordText === word.text ? "selected" : ""
            }`}
            key={`summary-${word.text}`}
            onClick={() => activateWord(word.text)}
            onPointerEnter={() => setHoveredWordText(word.text)}
            onPointerLeave={() => setHoveredWordText(null)}
            type="button"
          >
            <span>{index + 1}</span>
            <strong>{word.text}</strong>
            <em>
              {word.count.toLocaleString("ko-KR")}회 ·{" "}
              {word.candidateCount?.toLocaleString("ko-KR") ?? "-"}명 ·{" "}
              {displayRate(word.candidateRate)}
            </em>
          </button>
        ))}
      </div>

      <div className="cloud-mode-tabs" role="tablist" aria-label="키워드 보기">
        {datasets.map((dataset) => (
          <button
            aria-selected={dataset.id === activeId}
            className={dataset.id === activeId ? "active" : ""}
            key={dataset.id}
            onClick={() => {
              setActiveId(dataset.id);
              setSelectedWordText(null);
              setPointer(null);
              setTooltip(null);
            }}
            role="tab"
            type="button"
          >
            <span>{dataset.label}</span>
            <small>{datasetSubtexts[dataset.id]}</small>
          </button>
        ))}
      </div>

      <div className="cloud-controlbar" aria-label="키워드 탐색 도구">
        <label className="keyword-search">
          <span>키워드 검색</span>
          <input
            onChange={(event) => {
              setQuery(event.target.value);
              setPointer(null);
              setTooltip(null);
            }}
            placeholder="예: AI, 돌봄, 기초학력"
            type="search"
            value={query}
          />
        </label>
        <label className="keyword-sort">
          <span>정렬</span>
          <select
            onChange={(event) => {
              setSortMode(event.target.value as SortMode);
              setPointer(null);
              setTooltip(null);
            }}
            value={sortMode}
          >
            <option value="count">빈도순</option>
            <option value="candidateRate">언급률순</option>
            <option value="candidateCount">후보자수순</option>
          </select>
        </label>
        <div className="cloud-control-actions">
          <a href="/analysis/education-wordcloud/downloads/keywords">
            CSV 다운로드
          </a>
          <a href="#analysis-method">분석 기준 보기</a>
        </div>
      </div>

      <div className="cloud-legend" aria-label={legendLabel}>
        <strong>{legendLabel}</strong>
        <div className="cloud-legend-chips" aria-hidden="true">
          <span className="legend-chip low" />
          <span className="legend-chip middle" />
          <span className="legend-chip high" />
        </div>
        <span>낮음</span>
        <span>중간</span>
        <span>높음</span>
      </div>

      <details
        className="cloud-disclosure"
        onToggle={(event) => setIsCloudOpen(event.currentTarget.open)}
        open={isCloudOpen}
      >
        <summary>워드클라우드 보기</summary>
        <div className="cloud-visual-grid">
          <div
            ref={stageRef}
            className={`live-cloud-stage dock-cloud-stage ${
              activeDataset.id === "categories" ? "category-cloud-stage" : ""
            }`}
            aria-busy={layoutWords.length === 0}
            onPointerLeave={() => {
              setPointer(null);
              setTooltip(null);
              setHoveredWordText(null);
            }}
            onPointerMove={(event) => {
              const position = stagePosition(
                stageRef.current,
                event.clientX,
                event.clientY
              );

              if (position) {
                setPointer(position.percent);
              }
            }}
          >
            {layoutWords.length === 0 ? (
              <span className="cloud-loading">클라우드 배치 계산 중</span>
            ) : null}
            {activeDataset.id === "categories" ? (
              <svg
                aria-label="정책 분야 버블 클러스터"
                className="cloud-svg category-cloud-svg"
                role="img"
                viewBox={`0 0 ${stageSize.width} ${stageSize.height}`}
              >
                {layoutWords.map((word) => {
                  const parts = splitCategoryLabel(word.text);
                  const isHighlighted = highlightedWordText === word.text;

                  return (
                    <g
                      aria-label={wordAriaLabel(word)}
                      className={`category-bubble-node ${
                        isHighlighted ? "highlighted" : ""
                      }`}
                      focusable="true"
                      key={`${activeDataset.id}-${word.text}`}
                      onBlur={() => {
                        setHoveredWordText(null);
                        setTooltip(null);
                      }}
                      onClick={() => activateWord(word.text)}
                      onFocus={(event) => {
                        setHoveredWordText(word.text);
                        updateTooltip(word, event.currentTarget);
                      }}
                      onKeyDown={(event) => handleWordKeyDown(event, word.text)}
                      onPointerEnter={(event) => {
                        setHoveredWordText(word.text);
                        updateTooltip(word, event.currentTarget);
                      }}
                      onPointerMove={(event) => {
                        updateTooltip(word, event.currentTarget);
                      }}
                      role="button"
                      tabIndex={0}
                      transform={categoryBubbleTransform(word, pointer)}
                    >
                      <circle
                        className="category-bubble"
                        fill={colorForRatio(word.colorRatio)}
                        r={word.bubbleRadius}
                      />
                      <text
                        className="category-bubble-label"
                        dominantBaseline="middle"
                        fontSize={word.size}
                        fontWeight={900}
                        textAnchor="middle"
                      >
                        {parts.map((part, index) => (
                          <tspan
                            dy={index === 0 ? "-0.45em" : "1.05em"}
                            key={`${word.text}-${part}`}
                            x="0"
                          >
                            {part}
                          </tspan>
                        ))}
                      </text>
                      <text
                        className="category-bubble-count"
                        dy="2.45em"
                        textAnchor="middle"
                      >
                        {word.count.toLocaleString("ko-KR")}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <svg
                aria-label={`${activeDataset.label} 워드클라우드`}
                className="cloud-svg"
                role="img"
                viewBox={`0 0 ${stageSize.width} ${stageSize.height}`}
              >
                {layoutWords.map((word) => {
                  const isHighlighted = highlightedWordText === word.text;

                  return (
                    <g
                      aria-label={wordAriaLabel(word)}
                      className={`cloud-word-node ${
                        isHighlighted ? "highlighted" : ""
                      }`}
                      focusable="true"
                      key={`${activeDataset.id}-${word.text}`}
                      onBlur={() => {
                        setHoveredWordText(null);
                        setTooltip(null);
                      }}
                      onClick={() => activateWord(word.text)}
                      onFocus={(event) => {
                        setHoveredWordText(word.text);
                        updateTooltip(word, event.currentTarget);
                      }}
                      onKeyDown={(event) => handleWordKeyDown(event, word.text)}
                      onPointerEnter={(event) => {
                        setHoveredWordText(word.text);
                        updateTooltip(word, event.currentTarget);
                      }}
                      onPointerMove={(event) => {
                        updateTooltip(word, event.currentTarget);
                      }}
                      role="button"
                      tabIndex={0}
                      transform={wordTransform(word)}
                    >
                      <text
                        className="cloud-word dock-cloud-word"
                        dominantBaseline="central"
                        fill={colorForRatio(word.colorRatio)}
                        fontSize={word.size}
                        fontWeight={900}
                        style={wordStyle(activeDataset.id, word, pointer)}
                        textAnchor="middle"
                      >
                        {word.text}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
            {tooltip ? (
              <div
                className={`cloud-tooltip ${tooltip.placement}`}
                role="status"
                style={tooltipStyle(tooltip)}
              >
                <strong>{tooltip.word.text}</strong>
                <span>{tooltip.word.count.toLocaleString("ko-KR")}회</span>
                {tooltip.word.candidateCount !== undefined ? (
                  <span>
                    {tooltip.word.candidateCount.toLocaleString("ko-KR")}명 언급
                  </span>
                ) : null}
                {tooltipText(tooltip.word) ? <em>{tooltipText(tooltip.word)}</em> : null}
              </div>
            ) : null}
          </div>

          <aside className="cloud-side-rank" aria-label="현재 보기 상위 5개">
            <div>
              <span>현재 보기</span>
              <h2>상위 5개</h2>
            </div>
            <ol>
              {filteredWords.slice(0, 5).map((word, index) => (
                <li
                  className={highlightedWordText === word.text ? "highlighted" : ""}
                  key={`side-${word.text}`}
                  onPointerEnter={() => setHoveredWordText(word.text)}
                  onPointerLeave={() => setHoveredWordText(null)}
                >
                  <button onClick={() => activateWord(word.text)} type="button">
                    <span>{index + 1}</span>
                    <strong>{word.text}</strong>
                    <em>
                      {word.count.toLocaleString("ko-KR")}회
                      {word.candidateRate !== undefined
                        ? ` · ${displayRate(word.candidateRate)}`
                        : ""}
                    </em>
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </details>

      <div className="cloud-table-wrap" id="keyword-table">
        <div className="cloud-table-heading">
          <div>
            <h2>상세 키워드 표</h2>
            <p>{tableSummary}</p>
          </div>
          <span>{activeDataset.label}</span>
        </div>
        <table className="cloud-table">
          <thead>
            <tr>
              <th>{rankLabel}</th>
              <th>{keywordLabel}</th>
              <th>{countLabel}</th>
              <th>{candidateLabel}</th>
              <th>{detailLabel}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((word, index) => (
              <tr
                className={highlightedWordText === word.text ? "highlighted" : ""}
                key={`${activeDataset.id}-row-${word.text}`}
                onClick={() => activateWord(word.text)}
                onPointerEnter={() => setHoveredWordText(word.text)}
                onPointerLeave={() => setHoveredWordText(null)}
              >
                <td>{index + 1}</td>
                <td>{word.text}</td>
                <td>{word.count.toLocaleString("ko-KR")}</td>
                <td>
                  {word.candidateCount !== undefined
                    ? `${word.candidateCount.toLocaleString("ko-KR")}명`
                    : "-"}
                </td>
                <td>{word.detail ?? displayRate(word.candidateRate) ?? "-"}</td>
              </tr>
            ))}
            {tableRows.length === 0 ? (
              <tr>
                <td className="empty-state" colSpan={5}>
                  검색 조건에 맞는 키워드가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="mobile-keyword-list" aria-label="모바일 키워드 목록">
          {tableRows.map((word, index) => (
            <button
              className={`mobile-keyword-card ${
                highlightedWordText === word.text ? "highlighted" : ""
              }`}
              key={`${activeDataset.id}-mobile-${word.text}`}
              onClick={() => activateWord(word.text)}
              type="button"
            >
              <span>{index + 1}</span>
              <strong>{word.text}</strong>
              <em>
                {word.count.toLocaleString("ko-KR")}회 ·{" "}
                {word.candidateCount !== undefined
                  ? `${word.candidateCount.toLocaleString("ko-KR")}명 언급`
                  : "후보자수 없음"}{" "}
                · {word.detail ?? displayRate(word.candidateRate) ?? "상세 없음"}
              </em>
            </button>
          ))}
        </div>
      </div>

      <section className="analysis-method-panel" id="analysis-method">
        <div>
          <span>분석 기준 및 출처</span>
          <h2>5대공약 PDF 58건만 비교했습니다</h2>
        </div>
        <p>
          데이터 생성: {generatedAt} · 분석 제외어:{" "}
          {excludedTerms.join("·")}(일반 배경어). 형태소 추출 뒤 정책 비교에
          유효한 세부 키워드와 반복 구문을 집계했고, 후보자 언급률은 해당
          키워드가 한 번 이상 등장한 후보자 비율입니다.
        </p>
        <div className="analysis-method-links">
          <a href="/analysis/education-wordcloud/downloads/pdf-links">
            PDF 목록 다운로드
          </a>
          <a href="/analysis/education-wordcloud/downloads/keywords">
            키워드 CSV 다운로드
          </a>
        </div>
      </section>
    </section>
  );
}
