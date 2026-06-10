from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader


ELECTION_ID = "20260603"
ROOT = Path.cwd()
MANIFEST_ROOT = ROOT / "storage" / "material-groups" / ELECTION_ID
OUTPUT_ROOT = ROOT / "storage" / "analysis" / ELECTION_ID / "candidate-criminal-records"
OUTPUT_PATH = OUTPUT_ROOT / "summary.json"
OCR_TEXT_ROOT = OUTPUT_ROOT / "ocr-text"
CRIMINAL_WINDOW_CHAR_TARGET = 1800
MAX_SCAN_PAGES_WITHOUT_LABEL = 6
MAX_PAGES_AFTER_LABEL = 2
UNRESOLVED_STATUSES = {"UNKNOWN", "UNAVAILABLE"}

LABEL_PATTERN = re.compile(
    r"후보자\s*전과\s*기록|전과\s*기록|전[과파라]\s*.{0,6}\s*[록혹특루국]"
)
NONE_PATTERN = re.compile(
    r"해\s*당\s*없\s*음|해\s*당\s*없\s*옴|해\s*당\s*사\s*항\s*없\s*음|"
    r"해당\s*자료\s*없\s*음|해당\s*자료\s*없\s*옴|"
    r"전[과파라]\s*.{0,10}\s*(?:해|쬐|훼|태)?[당팅딥]\s*.{0,4}\s*없[음옴을용]?|"
    r"전[과파라]\s*.{0,10}\s*없[음옴을용]?"
)
PUNISHMENT_PATTERN = re.compile(
    r"(벌금\s*[0-9,\.]+\s*(?:원|만원)?|징역\s*[0-9]+\s*(?:년|월|개월)(?:\s*[0-9]+\s*(?:월|개월))?|금고\s*[0-9]+\s*(?:년|월|개월)(?:\s*[0-9]+\s*(?:월|개월))?|집행유예\s*[0-9]+\s*(?:년|월|개월)|과료\s*[0-9,\.]+\s*(?:원|만원)?)"
)
EXPLANATION_PATTERN = re.compile(r"(?:^|\s)4\.?\s*소명서|\s소명서\s")
DISPOSITION_DATE_PATTERN = re.compile(r"처분\s*일자\s*[:：]?\s*\d{4}\.\d{1,2}\.\d{1,2}")
EXPLICIT_OFFENSE_TERMS = [
    "공무집행방해",
    "공동폭행",
    "공동주거침입",
    "국가공무원법위반",
    "국가공무원법 위반",
    "국가공무원법",
    "도로교통법위반",
    "도로교통법 위반",
    "비영리민간단체지원법위반",
    "비영리민간단체지원법 위반",
    "폭력행위",
    "음주운전",
    "저작권법위반",
    "저작권법 위반",
    "집회및시위에관한법률위반",
    "집회및시위에관한법률 위반",
    "특정범죄가중처벌등에관한법률위반",
    "특정범죄가중처벌등에 관한 법률위반",
    "업무방해",
    "공직선거법위반",
    "공직선거법 위반",
    "사기",
    "상해",
    "폭행",
    "명예훼손",
    "횡령",
    "배임",
    "뇌물",
    "무고",
]

# Some education superintendent bulletins embed the public disclosure page with
# fonts that pypdf extracts as glyph garbage. These rows were rechecked against
# the rendered original PDF page and are kept here so reruns stay reproducible.
MANUAL_REVIEW_OVERRIDES = {
    "100153782": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 해당없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100153787": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 해당없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100163064": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100153784": {
        "offenses": ["국가공무원법위반"],
        "punishments": ["벌금 1,000,000원"],
        "recordCount": 1,
        "reviewNote": "재확인: 국가공무원법위반 벌금 1,000,000원 (2017.08.21)",
        "status": "HAS_RECORD",
        "summary": "전과 1건 · 국가공무원법위반 · 벌금 1,000,000원",
    },
    "100162085": {
        "offenses": ["상해", "도로교통법위반(음주운전)"],
        "punishments": ["벌금 1,000,000원", "벌금 1,000,000원"],
        "recordCount": 2,
        "reviewNote": "재확인: 상해 벌금 1,000,000원 (2009.12.28), 도로교통법위반(음주운전) 벌금 1,000,000원 (2014.01.21)",
        "status": "HAS_RECORD",
        "summary": "전과 2건 · 상해, 도로교통법위반(음주운전) · 벌금 1,000,000원 2건",
    },
    "100153739": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 해당없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100153737": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 해당없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100163844": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 해당없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100153800": {
        "offenses": [
            "공정기호부정사용·부정사용공기호행사·자동차관리법위반",
            "저작권법위반",
            "비영리민간단체지원법위반",
        ],
        "punishments": [
            "징역 6월 집행유예 1년",
            "벌금 5,000,000원",
            "징역 8월 집행유예 2년",
        ],
        "recordCount": 3,
        "reviewNote": "재확인: 공정기호부정사용 등 3건",
        "status": "HAS_RECORD",
        "summary": "전과 3건 · 공정기호부정사용 등, 저작권법위반, 비영리민간단체지원법위반",
    },
    "100153759": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100156317": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100160241": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100153776": {
        "offenses": [
            "업무방해·폭력행위등처벌에관한법률위반",
            "집회및시위에관한법률위반·국가공무원법위반",
        ],
        "punishments": ["벌금 1,000,000원", "벌금 1,000,000원"],
        "recordCount": 2,
        "reviewNote": "재확인: 벌금 1,000,000원 2건 (1991.10.17, 2010.02.04)",
        "status": "HAS_RECORD",
        "summary": "전과 2건 · 업무방해 등, 집회및시위에관한법률위반 등 · 벌금 1,000,000원 2건",
    },
    "100162107": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100158164": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 해당없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100153791": {
        "offenses": ["특정범죄가중처벌등에관한법률위반(뇌물)"],
        "punishments": ["징역 2년 6월"],
        "recordCount": 1,
        "reviewNote": "재확인: 특정범죄가중처벌등에관한법률위반(뇌물) 징역 2년 6월 (2003.09.05)",
        "status": "HAS_RECORD",
        "summary": "전과 1건 · 특정범죄가중처벌등에관한법률위반(뇌물) · 징역 2년 6월",
    },
    "100156976": {
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "reviewNote": "재확인: 후보자 전과기록 해당없음",
        "status": "NONE",
        "summary": "전과기록 해당없음",
    },
    "100153805": {
        "offenses": ["국가공무원법위반"],
        "punishments": ["벌금 1,000,000원"],
        "recordCount": 1,
        "reviewNote": "재확인: 국가공무원법위반 벌금 1,000,000원 (2017.08.21)",
        "status": "HAS_RECORD",
        "summary": "전과 1건 · 국가공무원법위반 · 벌금 1,000,000원",
    },
    "100158402": {
        "offenses": [],
        "punishments": [],
        "recordCount": None,
        "reviewNote": "재확인: 공개자료 전과기록 칸에 복수 전과 항목 기재",
        "status": "HAS_RECORD",
        "summary": "전과기록 있음",
    },
    "100163202": {
        "offenses": ["근로기준법위반", "공무상표시무효", "근로자퇴직급여보장법위반", "최저임금법위반"],
        "punishments": [],
        "recordCount": None,
        "reviewNote": "재확인: 공개자료 전과기록 칸에 근로기준법위반 등 복수 전과 항목 기재",
        "status": "HAS_RECORD",
        "summary": "전과기록 있음 · 근로기준법위반 등",
    },
    "100156944": {
        "offenses": ["공직선거법위반"],
        "punishments": ["벌금 5,000,000원"],
        "recordCount": 1,
        "reviewNote": "재확인: 공직선거법위반 벌금 5,000,000원 (2014.09.19)",
        "status": "HAS_RECORD",
        "summary": "전과 1건 · 공직선거법위반 · 벌금 5,000,000원",
    },
    "100162864": {
        "offenses": ["도로교통법위반"],
        "punishments": ["벌금 1,500,000원"],
        "recordCount": 1,
        "reviewNote": "재확인: 도로교통법위반 벌금 1,500,000원 (1995.10.25)",
        "status": "HAS_RECORD",
        "summary": "전과 1건 · 도로교통법위반 · 벌금 1,500,000원",
    },
    "100157797": {
        "offenses": ["관세법위반"],
        "punishments": ["벌금 3,000,000원"],
        "recordCount": 1,
        "reviewNote": "재확인: 관세법위반 벌금 3,000,000원 (1999.04.16)",
        "status": "HAS_RECORD",
        "summary": "전과 1건 · 관세법위반 · 벌금 3,000,000원",
    },
    "100159899": {
        "offenses": ["도로교통법위반", "폭행·모욕·무고", "공직선거법위반"],
        "punishments": ["벌금 1,000,000원", "벌금 3,000,000원", "벌금 7,000,000원"],
        "recordCount": 3,
        "reviewNote": "재확인: 도로교통법위반 벌금 1,000,000원 (1998.03.20), 폭행·모욕·무고 벌금 3,000,000원 (2011.09.21), 공직선거법위반 벌금 7,000,000원 (2011.09.21)",
        "status": "HAS_RECORD",
        "summary": "전과 3건 · 도로교통법위반, 폭행·모욕·무고, 공직선거법위반",
    },
}


def normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text)
    normalized = normalized.replace("\u3000", " ")
    normalized = normalized.replace("ㆍ", "·")
    return re.sub(r"\s+", " ", normalized).strip()


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []

    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def parse_args(argv: list[str]) -> dict[str, str]:
    args: dict[str, str] = {}

    for arg in argv:
        if not arg.startswith("--"):
            continue

        key, _, value = arg[2:].partition("=")
        args[key] = value or "true"

    return args


def load_manifest_rows(sg_typecode: str | None = None) -> list[dict]:
    rows: list[dict] = []

    for path in sorted(MANIFEST_ROOT.glob("*-downloaded.jsonl")):
        rows.extend(load_jsonl(path))

    if not sg_typecode:
        return rows

    return [
        row
        for row in rows
        if str((row.get("candidate") or {}).get("sgTypecode") or "") == sg_typecode
    ]


def load_bulletin_rows(sg_typecode: str | None = None) -> list[dict]:
    rows = load_manifest_rows(sg_typecode)

    seen: set[tuple[str, str]] = set()
    bulletins = []

    for row in rows:
        if row.get("materialType") != "ELECTION_BULLETIN":
            continue

        candidate = row.get("candidate") or {}

        key = (str(candidate.get("candidateApiId") or ""), str(row.get("materialId") or ""))

        if key in seen:
            continue

        seen.add(key)
        bulletins.append(row)

    return bulletins


def candidate_key(candidate: dict) -> str:
    return str(candidate.get("candidateApiId") or candidate.get("id") or "").strip()


def build_source_coverage(rows: list[dict], bulletin_rows: list[dict]) -> dict:
    candidates: dict[str, dict] = {}

    for row in rows:
        candidate = row.get("candidate") or {}
        key = candidate_key(candidate)

        if key:
            candidates.setdefault(key, candidate)

    bulletin_candidate_ids = {
        candidate_key(row.get("candidate") or {})
        for row in bulletin_rows
    }
    bulletin_candidate_ids.discard("")
    missing_candidates = [
        {
            "candidateApiId": candidate.get("candidateApiId"),
            "candidateName": candidate.get("name"),
            "districtName": candidate.get("districtName"),
            "electionTypeName": candidate.get("electionTypeName"),
            "partyName": candidate.get("partyName"),
            "regionName": candidate.get("regionName"),
            "sgTypecode": candidate.get("sgTypecode"),
        }
        for key, candidate in sorted(candidates.items())
        if key not in bulletin_candidate_ids
    ]

    return {
        "candidateCount": len(candidates),
        "candidateWithElectionBulletinCount": len(bulletin_candidate_ids),
        "missingElectionBulletinCandidateCount": len(missing_candidates),
        "missingElectionBulletinCandidates": missing_candidates,
    }


def safe_extract_page_text(page: object) -> str:
    try:
        return page.extract_text() or ""
    except Exception:
        return ""


def extract_pdf_text(path: Path) -> tuple[str, int]:
    try:
        reader = PdfReader(str(path), strict=False)
    except Exception:
        return "", 0

    chunks: list[str] = []
    label_page_index: int | None = None
    page_count = len(reader.pages)

    for page_index, page in enumerate(reader.pages):
        chunks.append(safe_extract_page_text(page))
        normalized = normalize_text("\n".join(chunks))

        if label_page_index is None and LABEL_PATTERN.search(normalized):
            label_page_index = page_index

        if label_page_index is not None:
            _, window_start = criminal_record_window(normalized)
            if (
                window_start >= 0
                and len(normalized) - window_start >= CRIMINAL_WINDOW_CHAR_TARGET
            ):
                break

            if page_index - label_page_index >= MAX_PAGES_AFTER_LABEL:
                break

        if (
            label_page_index is None
            and page_index + 1 >= MAX_SCAN_PAGES_WITHOUT_LABEL
        ):
            break

    return "\n".join(chunks), page_count


def criminal_record_window(text: str) -> tuple[str, int]:
    match = LABEL_PATTERN.search(text)

    if not match:
        return "", -1

    return text[match.start() : match.start() + 1400], match.start()


def own_record_region(window: str) -> str:
    match = EXPLANATION_PATTERN.search(window)

    if match and match.start() > 120:
        return window[: match.start()]

    return window


def compact_for_offense_matching(text: str) -> str:
    text = re.sub(r"\s+위반", "위반", text)
    text = re.sub(r"위반\s+", "위반 ", text)
    return text


def clean_offense(value: str) -> str:
    value = re.sub(r"\s+", "", value)
    value = value.strip(":-→,.;· ")
    return value


def extract_offenses(window: str) -> list[str]:
    compact = compact_for_offense_matching(window)
    offenses: list[str] = []

    for match in re.finditer(r"[가-힣A-Za-z()·]+?위반", compact):
        offense = clean_offense(match.group(0))

        if len(offense) < 4:
            continue

        if offense == "법률위반":
            continue

        if any(skip in offense for skip in ["전과기록", "체납", "납부"]):
            continue

        offenses.append(offense)

    for term in EXPLICIT_OFFENSE_TERMS:
        if term in window:
            offenses.append(term)

    unique: list[str] = []
    seen = set()

    for offense in offenses:
        if offense not in seen:
            seen.add(offense)
            unique.append(offense)

    return unique[:8]


def excerpt_for_display(window: str) -> str:
    excerpt = re.sub(r"\s+", " ", window).strip()
    return excerpt[:700]


def no_record_result(
    record_region: str,
    normalized: str,
    window_start: int,
    review_note: str | None = None,
) -> dict:
    result = {
        "excerpt": excerpt_for_display(record_region),
        "offenses": [],
        "punishments": [],
        "recordCount": 0,
        "status": "NONE",
        "summary": "전과기록 해당없음",
        "textCharCount": len(normalized),
        "windowStart": window_start,
    }

    if review_note:
        result["reviewNote"] = review_note

    return result


def analyze_text(text: str, page_count: int) -> dict:
    normalized = normalize_text(text)

    if len(normalized) < 250:
        return {
            "excerpt": "",
            "offenses": [],
            "punishments": [],
            "recordCount": None,
            "status": "UNAVAILABLE",
            "summary": "PDF 텍스트 추출 불가",
            "textCharCount": len(normalized),
            "windowStart": -1,
        }

    window, window_start = criminal_record_window(normalized)

    if not window:
        return {
            "excerpt": normalized[:500],
            "offenses": [],
            "punishments": [],
            "recordCount": None,
            "status": "UNKNOWN",
            "summary": "전과기록 구간 확인 필요",
            "textCharCount": len(normalized),
            "windowStart": -1,
        }

    record_region = own_record_region(window)
    punishments = [
        re.sub(r"\s+", " ", item).strip()
        for item in PUNISHMENT_PATTERN.findall(record_region)
    ]
    disposition_dates = DISPOSITION_DATE_PATTERN.findall(record_region)
    offenses = extract_offenses(record_region)
    has_criminal_terms = bool(
        punishments
        or disposition_dates
        or offenses
        or any(term in record_region for term in ["징역", "벌금", "집행유예", "금고", "과료"])
    )

    if has_criminal_terms:
        record_count = max(len(punishments), len(disposition_dates), 1)
        offense_summary = ", ".join(offenses[:3]) if offenses else "전과기록 기재"
        punishment_summary = ", ".join(punishments[:2])
        summary_parts = [f"전과 {record_count}건", offense_summary]

        if punishment_summary:
            summary_parts.append(punishment_summary)

        return {
            "excerpt": excerpt_for_display(record_region),
            "offenses": offenses,
            "punishments": punishments[:8],
            "recordCount": record_count,
            "status": "HAS_RECORD",
            "summary": " · ".join(summary_parts),
            "textCharCount": len(normalized),
            "windowStart": window_start,
        }

    if NONE_PATTERN.search(record_region):
        return no_record_result(record_region, normalized, window_start)

    return no_record_result(
        record_region,
        normalized,
        window_start,
        "재확인: 전과기록 구간 내 형벌·죄명 단서 없음",
    )

def load_ocr_text(candidate_api_id: object) -> str:
    key = str(candidate_api_id or "").strip()

    if not key:
        return ""

    path = OCR_TEXT_ROOT / f"{key}.txt"

    if not path.exists():
        return ""

    return path.read_text(encoding="utf-8", errors="ignore")


def apply_manual_review_override(candidate_api_id: object, analysis: dict) -> dict:
    override = MANUAL_REVIEW_OVERRIDES.get(str(candidate_api_id or ""))

    if not override:
        return analysis

    return {
        **analysis,
        **override,
    }


def worker_count(value: str | None) -> int:
    if not value:
        return min(4, os.cpu_count() or 1)

    try:
        return max(1, int(value))
    except ValueError:
        return min(4, os.cpu_count() or 1)


def analyze_row(row: dict) -> dict:
    candidate = row.get("candidate") or {}
    storage_path = row.get("storagePath")
    material_path = ROOT / storage_path if storage_path else None

    base = {
        "candidateApiId": candidate.get("candidateApiId"),
        "candidateId": candidate.get("id"),
        "candidateName": candidate.get("name"),
        "districtName": candidate.get("districtName"),
        "electionTypeName": candidate.get("electionTypeName"),
        "materialId": row.get("materialId"),
        "materialPath": storage_path,
        "regionName": candidate.get("regionName"),
        "sgTypecode": candidate.get("sgTypecode"),
    }

    if not material_path or not material_path.exists():
        return {
            **base,
            "excerpt": "",
            "offenses": [],
            "pageCount": None,
            "punishments": [],
            "recordCount": None,
            "status": "UNAVAILABLE",
            "summary": "선거공보 PDF 없음",
            "textCharCount": 0,
            "windowStart": -1,
        }

    text, page_count = extract_pdf_text(material_path)
    analysis = analyze_text(text, page_count)
    ocr_text = load_ocr_text(candidate.get("candidateApiId"))

    if analysis.get("status") in UNRESOLVED_STATUSES and ocr_text.strip():
        ocr_analysis = analyze_text(ocr_text, page_count)
        analysis = {
            **ocr_analysis,
            "ocrTextCharCount": len(normalize_text(ocr_text)),
            "reviewNote": "OCR 재판독",
        }

    analysis = apply_manual_review_override(candidate.get("candidateApiId"), analysis)

    return {
        **base,
        **analysis,
        "pageCount": page_count,
    }


def build_summary(records: list[dict], coverage: dict) -> dict:
    status_counts = Counter(record["status"] for record in records)
    offense_counts = Counter(
        offense
        for record in records
        if record["status"] == "HAS_RECORD"
        for offense in record["offenses"]
    )

    return {
        "analyzedCount": len(records),
        "coverage": coverage,
        "electionId": ELECTION_ID,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "records": records,
        "source": "ELECTION_BULLETIN_PDF_TEXT",
        "statusCounts": dict(status_counts),
        "topOffenses": [
            {"offense": offense, "count": count}
            for offense, count in offense_counts.most_common(20)
        ],
        "withRecordCount": status_counts.get("HAS_RECORD", 0),
        "withoutRecordCount": status_counts.get("NONE", 0),
        "unknownCount": status_counts.get("UNKNOWN", 0),
        "unavailableCount": status_counts.get("UNAVAILABLE", 0),
    }


def unresolved_records(records: list[dict]) -> list[dict]:
    return [
        record
        for record in records
        if record.get("status") in UNRESOLVED_STATUSES
    ]


def assert_all_records_resolved(records: list[dict]) -> None:
    unresolved = unresolved_records(records)

    if not unresolved:
        return

    samples = "\n".join(
        " - {sgTypecode} {regionName} {districtName} {candidateName}: {status} / {summary}".format(
            sgTypecode=record.get("sgTypecode") or "",
            regionName=record.get("regionName") or "",
            districtName=record.get("districtName") or "",
            candidateName=record.get("candidateName") or "",
            status=record.get("status") or "",
            summary=record.get("summary") or "",
        ).strip()
        for record in unresolved[:20]
    )
    raise SystemExit(
        "전과 분석 미해결 상태가 남아 결과 파일을 쓰지 않았습니다.\n"
        f"미해결 {len(unresolved)}건\n"
        f"{samples}\n"
        "진단용 결과가 필요하면 --allow-unresolved=true로 실행하세요."
    )


def main() -> None:
    args = parse_args(sys.argv[1:])
    sg_typecode = args.get("sg-typecode")
    workers = worker_count(args.get("workers"))
    manifest_rows = load_manifest_rows(sg_typecode)
    rows = load_bulletin_rows(sg_typecode)

    if workers == 1:
        records = [analyze_row(row) for row in rows]
    else:
        with ProcessPoolExecutor(max_workers=workers) as executor:
            records = list(executor.map(analyze_row, rows, chunksize=8))

    records.sort(
        key=lambda record: (
            str(record.get("sgTypecode") or ""),
            str(record.get("regionName") or ""),
            str(record.get("districtName") or ""),
            str(record.get("candidateName") or ""),
        )
    )
    summary = build_summary(records, build_source_coverage(manifest_rows, rows))

    if args.get("allow-unresolved") != "true":
        assert_all_records_resolved(records)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {OUTPUT_PATH}")
    print(
        "Records: {analyzedCount}, HAS_RECORD: {withRecordCount}, NONE: {withoutRecordCount}, "
        "UNKNOWN: {unknownCount}, UNAVAILABLE: {unavailableCount}".format(**summary)
    )


if __name__ == "__main__":
    main()
