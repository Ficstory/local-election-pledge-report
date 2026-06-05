from __future__ import annotations

import csv
import json
import math
import random
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader


ELECTION_ID = "20260603"
ROOT = Path.cwd()
MANIFEST_PATH = ROOT / "storage" / "material-groups" / ELECTION_ID / "education-superintendents-downloaded.jsonl"
OUTPUT_ROOT = ROOT / "storage" / "analysis" / ELECTION_ID / "education-top-five-keywords"

FONT_REGULAR = Path("C:/Windows/Fonts/malgun.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/malgunbd.ttf")

TEMPLATE_PATTERNS = [
    r"선거명",
    r"후보자명",
    r"공약순위",
    r"공약\s*순위",
    r"제목",
    r"목표",
    r"이행방법",
    r"이행\s*방법",
    r"이행기간",
    r"이행\s*기간",
    r"재원조달방안",
    r"재원\s*조달\s*방안",
    r"공약이행",
    r"공약\s*이행",
    r"기타",
    r"해당없음",
    r"별첨",
    r"쪽",
    r"페이지",
    r"\d+\s*/\s*\d+",
    r"-\s*\d+\s*-",
    r"[가-힣]+교육감선거",
    r"교육감\s*선거",
    r"교육감",
]

TOKEN_STOPWORDS = {
    "그리고",
    "그러나",
    "대한",
    "대해",
    "등을",
    "또는",
    "모든",
    "및",
    "위한",
    "으로",
    "이다",
    "있는",
    "있도록",
    "통해",
    "한다",
    "합니다",
}

KEYWORDS = [
    "교육",
    "학생",
    "학교",
    "지원",
    "확대",
    "운영",
    "강화",
    "미래",
    "학력",
    "기초학력",
    "AI",
    "인공지능",
    "디지털",
    "진로",
    "안전",
    "돌봄",
    "늘봄",
    "방과후",
    "교권",
    "교사",
    "교원",
    "선생님",
    "학부모",
    "지역",
    "맞춤형",
    "공교육",
    "책임교육",
    "교육복지",
    "특수교육",
    "다문화",
    "유보통합",
    "급식",
    "무상",
    "체험",
    "환경",
    "학교폭력",
    "폭력",
    "회복",
    "인성",
    "민주시민",
    "생태",
    "예술",
    "체육",
    "직업",
    "취업",
    "고교학점제",
    "대입",
    "독서",
    "문해력",
    "수리력",
    "소통",
    "청렴",
    "예산",
    "시설",
    "과밀학급",
    "학급",
    "작은학교",
    "농산어촌",
    "마을교육",
    "유아",
    "초등",
    "중등",
    "고등",
    "미래교육",
    "교육과정",
    "평가",
    "수업",
    "학습",
    "인재",
    "역량",
    "자치",
    "혁신",
    "행복",
    "건강",
    "심리",
    "상담",
    "위기",
    "보호",
]

DOMAIN_GENERIC_TERMS = {
    "교육",
    "학교",
    "학생",
    "지원",
    "확대",
    "운영",
    "강화",
    "미래",
    "지역",
}

DETAILED_KEYWORDS = [
    "기초학력",
    "문해력",
    "수리력",
    "학력진단",
    "학습진단",
    "책임교육",
    "개별화교육",
    "맞춤형교육",
    "진로진학",
    "대입",
    "고교학점제",
    "AI",
    "인공지능",
    "디지털",
    "에듀테크",
    "코딩",
    "소프트웨어",
    "온라인",
    "스마트",
    "학교폭력",
    "교권",
    "교권보호",
    "아동학대",
    "피해학생",
    "위기학생",
    "상담",
    "심리",
    "마음건강",
    "정서",
    "회복",
    "안전",
    "돌봄",
    "늘봄",
    "늘봄학교",
    "방과후",
    "급식",
    "무상급식",
    "교육복지",
    "특수교육",
    "다문화",
    "유보통합",
    "유아교육",
    "교사",
    "교원",
    "업무경감",
    "연수",
    "수업권",
    "수업혁신",
    "농산어촌",
    "작은학교",
    "과밀학급",
    "통학",
    "시설",
    "학교시설",
    "석면",
    "급식실",
    "화장실",
    "인성",
    "독서",
    "예술",
    "체육",
    "생태",
    "환경",
    "민주시민",
    "학생자치",
    "청렴",
    "소통",
    "교육청",
    "예산",
]

POLICY_CATEGORIES = {
    "학력·진로": [
        "기초학력",
        "문해력",
        "수리력",
        "학력진단",
        "학습진단",
        "책임교육",
        "개별화교육",
        "맞춤형교육",
        "진로진학",
        "진로",
        "대입",
        "고교학점제",
        "평가",
    ],
    "AI·디지털": [
        "AI",
        "인공지능",
        "디지털",
        "에듀테크",
        "코딩",
        "소프트웨어",
        "온라인",
        "스마트",
    ],
    "안전·권리": [
        "학교폭력",
        "교권",
        "교권보호",
        "아동학대",
        "피해학생",
        "위기학생",
        "상담",
        "심리",
        "마음건강",
        "정서",
        "회복",
        "안전",
        "보호",
    ],
    "돌봄·복지": [
        "돌봄",
        "늘봄",
        "늘봄학교",
        "방과후",
        "급식",
        "무상급식",
        "교육복지",
        "특수교육",
        "다문화",
        "유보통합",
        "유아교육",
    ],
    "교원·수업": [
        "교사",
        "교원",
        "선생님",
        "업무경감",
        "연수",
        "수업권",
        "수업혁신",
        "수업",
    ],
    "지역·시설": [
        "농산어촌",
        "작은학교",
        "과밀학급",
        "통학",
        "시설",
        "학교시설",
        "석면",
        "급식실",
        "화장실",
    ],
    "인성·문화": [
        "인성",
        "독서",
        "예술",
        "체육",
        "생태",
        "환경",
        "민주시민",
        "학생자치",
    ],
    "행정·재정": [
        "청렴",
        "소통",
        "교육청",
        "예산",
    ],
}

PALETTE = [
    "#235789",
    "#2A9D8F",
    "#E76F51",
    "#6A4C93",
    "#7A542E",
    "#3A7D44",
    "#D1495B",
    "#277DA1",
    "#A23E48",
    "#4D908E",
]


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text)
    return text


def remove_templates(text: str, candidates: list[dict]) -> str:
    cleaned = text

    for pattern in TEMPLATE_PATTERNS:
        cleaned = re.sub(pattern, " ", cleaned, flags=re.IGNORECASE)

    for row in candidates:
        candidate = row["candidate"]
        for value in [
            candidate.get("name"),
            candidate.get("candidateApiId"),
            candidate.get("regionName"),
            candidate.get("districtName"),
        ]:
            if value:
                cleaned = cleaned.replace(str(value), " ")

    return normalize_text(cleaned)


def extract_pdf_text(path: Path) -> tuple[str, int]:
    reader = PdfReader(str(path))
    pages = []

    for page in reader.pages:
        pages.append(page.extract_text() or "")

    return "\n".join(pages), len(reader.pages)


def load_manifest() -> list[dict]:
    rows = [
        json.loads(line)
        for line in MANIFEST_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    return [
        row
        for row in rows
        if row["materialType"] == "TOP_FIVE_PLEDGES"
        and row["candidate"]["sgTypecode"] == "11"
    ]


def keyword_counts(text: str) -> Counter:
    counts: Counter = Counter()

    for keyword in KEYWORDS:
        if keyword == "AI":
            count = len(re.findall(r"(?<![A-Za-z])AI(?![A-Za-z])", text, re.IGNORECASE))
        else:
            count = text.count(keyword)

        if count:
            counts[keyword] = count

    if counts["인공지능"]:
        counts["AI"] += counts["인공지능"]
        del counts["인공지능"]

    return counts


def compact_text(text: str) -> str:
    return re.sub(r"[\s·,./:;()\[\]{}<>「」『』“”\"'!?+-]+", "", text)


def count_detailed_keywords(text: str) -> Counter:
    compact = compact_text(text)
    counts: Counter = Counter()

    for keyword in DETAILED_KEYWORDS:
        if keyword == "AI":
            count = len(re.findall(r"(?<![A-Za-z])AI(?![A-Za-z])", text, re.IGNORECASE))
        elif keyword == "인공지능":
            count = compact.count(keyword)
        else:
            count = compact.count(compact_text(keyword))

        if count:
            counts[keyword] = count

    if counts["인공지능"]:
        counts["AI"] += counts["인공지능"]
        del counts["인공지능"]

    return counts


def category_rows(counter: Counter) -> list[dict]:
    rows = []

    for category, terms in POLICY_CATEGORIES.items():
        term_counts = Counter({term: counter[term] for term in terms if counter[term]})
        rows.append(
            {
                "category": category,
                "count": sum(term_counts.values()),
                "topTerms": [
                    {"keyword": keyword, "count": count}
                    for keyword, count in term_counts.most_common(8)
                ],
            }
        )

    return sorted(rows, key=lambda row: row["count"], reverse=True)


def write_category_csv(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["rank", "category", "count", "top_terms"])

        for rank, row in enumerate(rows, start=1):
            top_terms = ", ".join(
                f"{term['keyword']}({term['count']})" for term in row["topTerms"]
            )
            writer.writerow([rank, row["category"], row["count"], top_terms])


def write_keyword_coverage_csv(
    path: Path,
    counter: Counter,
    candidate_coverage: Counter,
    candidate_count: int,
) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["rank", "keyword", "count", "candidate_count", "candidate_rate"])

        for rank, (keyword, count) in enumerate(counter.most_common(), start=1):
            coverage = candidate_coverage[keyword]
            rate = round(coverage / candidate_count, 4) if candidate_count else 0
            writer.writerow([rank, keyword, count, coverage, rate])


def token_counts(text: str, dynamic_stopwords: set[str]) -> Counter:
    counter: Counter = Counter()

    for token in re.findall(r"[가-힣A-Za-z][가-힣A-Za-z0-9·]{1,}", text):
        token = token.strip("·").lower()

        if len(token) < 2:
            continue

        if token in TOKEN_STOPWORDS or token in dynamic_stopwords:
            continue

        if re.fullmatch(r"[a-z]{1,2}", token) and token != "ai":
            continue

        counter[token.upper() if token == "ai" else token] += 1

    return counter


def phrase_counts(text: str, dynamic_stopwords: set[str]) -> Counter:
    tokens = []
    phrase_stopwords = TOKEN_STOPWORDS | dynamic_stopwords | DOMAIN_GENERIC_TERMS | {
        "구축",
        "기반",
        "도입",
        "시스템",
        "임기",
        "재원",
        "조달",
        "추진",
        "통한",
        "프로그램",
    }

    for token in re.findall(r"[가-힣A-Za-z][가-힣A-Za-z0-9·]{1,}", text):
        normalized = token.strip("·").lower()

        if not normalized or normalized in phrase_stopwords:
            tokens.append(None)
            continue

        if re.fullmatch(r"[a-z]{1,2}", normalized) and normalized != "ai":
            tokens.append(None)
            continue

        tokens.append(normalized.upper() if normalized == "ai" else normalized)

    counter: Counter = Counter()

    for ngram_size in [2, 3]:
        for index in range(0, len(tokens) - ngram_size + 1):
            window = tokens[index : index + ngram_size]

            if any(token is None for token in window):
                continue

            phrase = " ".join(window)

            if len(phrase.replace(" ", "")) < 5:
                continue

            counter[phrase] += 1

    return Counter(
        {
            phrase: count
            for phrase, count in counter.items()
            if count >= 4
        }
    )


def write_counter_csv(path: Path, counter: Counter) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["rank", "keyword", "count"])

        for rank, (keyword, count) in enumerate(counter.most_common(), start=1):
            writer.writerow([rank, keyword, count])


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    return right - left, bottom - top


def overlaps(box: tuple[int, int, int, int], boxes: list[tuple[int, int, int, int]], padding: int = 5) -> bool:
    left, top, right, bottom = box

    for other_left, other_top, other_right, other_bottom in boxes:
        if (
            left < other_right + padding
            and right + padding > other_left
            and top < other_bottom + padding
            and bottom + padding > other_top
        ):
            return True

    return False


def place_word(
    draw: ImageDraw.ImageDraw,
    word: str,
    font: ImageFont.FreeTypeFont,
    width: int,
    height: int,
    boxes: list[tuple[int, int, int, int]],
    rng: random.Random,
) -> tuple[int, int, int, int] | None:
    word_width, word_height = text_size(draw, word, font)
    center_x = width // 2
    center_y = height // 2
    angle = rng.random() * math.tau

    for step in range(900):
        radius = 4 + step * 3.2
        x = int(center_x + math.cos(angle + step * 0.38) * radius - word_width / 2)
        y = int(center_y + math.sin(angle + step * 0.38) * radius - word_height / 2)
        box = (x, y, x + word_width, y + word_height)

        if x < 30 or y < 30 or box[2] > width - 30 or box[3] > height - 30:
            continue

        if not overlaps(box, boxes):
            return box

    return None


def render_wordcloud(path: Path, counter: Counter, title: str) -> None:
    width, height = 1600, 1000
    image = Image.new("RGB", (width, height), "#ffffff")
    draw = ImageDraw.Draw(image)
    rng = random.Random(20260603)
    words = counter.most_common(80)

    if not words:
        image.save(path)
        return

    title_font = ImageFont.truetype(str(FONT_BOLD), 40)
    draw.text((40, 32), title, fill="#222222", font=title_font)

    max_count = words[0][1]
    min_count = words[-1][1]
    boxes: list[tuple[int, int, int, int]] = [(30, 25, width - 30, 92)]

    for index, (word, count) in enumerate(words):
        if max_count == min_count:
            font_size = 52
        else:
            scale = (math.sqrt(count) - math.sqrt(min_count)) / (
                math.sqrt(max_count) - math.sqrt(min_count)
            )
            font_size = int(24 + scale * 88)

        for adjusted_size in range(font_size, 17, -3):
            font = ImageFont.truetype(str(FONT_BOLD if index < 20 else FONT_REGULAR), adjusted_size)
            box = place_word(draw, word, font, width, height, boxes, rng)

            if box:
                color = PALETTE[index % len(PALETTE)]
                draw.text((box[0], box[1]), word, fill=color, font=font)
                boxes.append(box)
                break

    image.save(path)


def main() -> None:
    rows = load_manifest()
    dynamic_stopwords = {
        value
        for row in rows
        for value in [
            row["candidate"].get("name"),
            row["candidate"].get("candidateApiId"),
            row["candidate"].get("regionName"),
            row["candidate"].get("districtName"),
        ]
        if value
    }

    all_cleaned_text = []
    extraction_rows = []
    per_candidate_detailed_counts = {}

    for row in rows:
        storage_path = ROOT / row["storagePath"]
        raw_text, page_count = extract_pdf_text(storage_path)
        normalized_text = normalize_text(raw_text)
        cleaned_text = remove_templates(normalized_text, rows)
        all_cleaned_text.append(cleaned_text)
        per_candidate_detailed_counts[row["candidate"]["candidateApiId"]] = count_detailed_keywords(
            cleaned_text
        )
        extraction_rows.append(
            {
                "candidateApiId": row["candidate"]["candidateApiId"],
                "candidateName": row["candidate"]["name"],
                "fileName": row["fileName"],
                "storagePath": row["storagePath"],
                "pageCount": page_count,
                "textChars": len(normalized_text),
                "hangulChars": sum("가" <= char <= "힣" for char in normalized_text),
            }
        )

    combined_text = "\n".join(all_cleaned_text)
    wordcloud_counter = keyword_counts(combined_text)
    topic_counter = Counter(
        {
            keyword: count
            for keyword, count in wordcloud_counter.items()
            if keyword not in DOMAIN_GENERIC_TERMS
        }
    )
    detailed_counter = count_detailed_keywords(combined_text)
    candidate_coverage: Counter = Counter()

    for candidate_counter in per_candidate_detailed_counts.values():
        for keyword, count in candidate_counter.items():
            if count:
                candidate_coverage[keyword] += 1

    category_summary = category_rows(detailed_counter)
    raw_token_counter = token_counts(combined_text, dynamic_stopwords)
    raw_phrase_counter = phrase_counts(combined_text, dynamic_stopwords)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    write_counter_csv(OUTPUT_ROOT / "keyword-frequency.csv", wordcloud_counter)
    write_counter_csv(OUTPUT_ROOT / "topic-keyword-frequency.csv", topic_counter)
    write_counter_csv(OUTPUT_ROOT / "detailed-keyword-frequency.csv", detailed_counter)
    write_keyword_coverage_csv(
        OUTPUT_ROOT / "detailed-keyword-coverage.csv",
        detailed_counter,
        candidate_coverage,
        len(per_candidate_detailed_counts),
    )
    write_counter_csv(OUTPUT_ROOT / "phrase-frequency.csv", raw_phrase_counter)
    write_category_csv(OUTPUT_ROOT / "policy-category-summary.csv", category_summary)
    write_counter_csv(OUTPUT_ROOT / "raw-token-frequency.csv", raw_token_counter)

    render_wordcloud(
        OUTPUT_ROOT / "wordcloud-keywords.png",
        wordcloud_counter,
        "교육감 5대공약 키워드",
    )
    render_wordcloud(
        OUTPUT_ROOT / "wordcloud-topics.png",
        topic_counter,
        "교육감 5대공약 정책 주제 키워드",
    )
    render_wordcloud(
        OUTPUT_ROOT / "wordcloud-detailed-topics.png",
        detailed_counter,
        "교육감 5대공약 세부 정책 키워드",
    )

    with (OUTPUT_ROOT / "extraction-summary.jsonl").open("w", encoding="utf-8") as handle:
        for extraction_row in extraction_rows:
            handle.write(json.dumps(extraction_row, ensure_ascii=False) + "\n")

    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "manifestPath": str(MANIFEST_PATH.relative_to(ROOT)).replace("\\", "/"),
        "materialType": "TOP_FIVE_PLEDGES",
        "sgTypecode": "11",
        "candidateCount": len({row["candidate"]["candidateApiId"] for row in rows}),
        "materialCount": len(rows),
        "totalPages": sum(row["pageCount"] for row in extraction_rows),
        "totalTextChars": sum(row["textChars"] for row in extraction_rows),
        "totalHangulChars": sum(row["hangulChars"] for row in extraction_rows),
        "topKeywords": [
            {"keyword": keyword, "count": count}
            for keyword, count in wordcloud_counter.most_common(30)
        ],
        "topTopicKeywords": [
            {"keyword": keyword, "count": count}
            for keyword, count in topic_counter.most_common(30)
        ],
        "topDetailedKeywords": [
            {
                "keyword": keyword,
                "count": count,
                "candidateCount": candidate_coverage[keyword],
                "candidateRate": round(
                    candidate_coverage[keyword] / len(per_candidate_detailed_counts),
                    4,
                )
                if per_candidate_detailed_counts
                else 0,
            }
            for keyword, count in detailed_counter.most_common(40)
        ],
        "policyCategories": category_summary,
        "topPhrases": [
            {"keyword": keyword, "count": count}
            for keyword, count in raw_phrase_counter.most_common(40)
        ],
        "topRawTokens": [
            {"keyword": keyword, "count": count}
            for keyword, count in raw_token_counter.most_common(30)
        ],
        "outputs": {
            "keywordFrequencyCsv": "keyword-frequency.csv",
            "topicKeywordFrequencyCsv": "topic-keyword-frequency.csv",
            "detailedKeywordFrequencyCsv": "detailed-keyword-frequency.csv",
            "detailedKeywordCoverageCsv": "detailed-keyword-coverage.csv",
            "phraseFrequencyCsv": "phrase-frequency.csv",
            "policyCategorySummaryCsv": "policy-category-summary.csv",
            "rawTokenFrequencyCsv": "raw-token-frequency.csv",
            "wordcloudKeywordsPng": "wordcloud-keywords.png",
            "wordcloudTopicsPng": "wordcloud-topics.png",
            "wordcloudDetailedTopicsPng": "wordcloud-detailed-topics.png",
            "extractionSummaryJsonl": "extraction-summary.jsonl",
        },
    }

    (OUTPUT_ROOT / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
