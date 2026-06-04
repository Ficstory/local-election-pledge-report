export type PledgeContentItem = {
  text: string;
  details: string[];
};

export type PledgeContentSection = {
  title: string;
  looseLines: string[];
  items: PledgeContentItem[];
};

const fallbackSectionTitle = "원문";
const sectionMarkerPattern = /^[□■▣]\s*(.+)$/;
const itemMarkerPattern = /^[○◦ㅇ]\s*(.+)$/;
const detailMarkerPattern = /^[-–—ㆍ·•]\s*(.+)$/;

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function normalizeSectionTitle(text: string) {
  const normalized = normalizeText(text);
  const compact = normalized.replace(/\s+/g, "");

  switch (compact) {
    case "목표":
      return "목표";
    case "이행방법":
      return "이행방법";
    case "이행기간":
      return "이행기간";
    case "재원조달방안등":
      return "재원조달방안 등";
    default:
      return normalized;
  }
}

function ensureSection(
  sections: PledgeContentSection[],
  title = fallbackSectionTitle
) {
  const existingSection = sections.at(-1);

  if (existingSection) {
    return existingSection;
  }

  const section = {
    title,
    looseLines: [],
    items: []
  };

  sections.push(section);
  return section;
}

function markerText(line: string, pattern: RegExp) {
  const match = line.trim().match(pattern);
  return match ? normalizeText(match[1]) : undefined;
}

export function parsePledgeContent(content: string): PledgeContentSection[] {
  const sections: PledgeContentSection[] = [];
  let currentItem: PledgeContentItem | undefined;

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    const sectionTitle = markerText(trimmedLine, sectionMarkerPattern);

    if (sectionTitle) {
      sections.push({
        title: normalizeSectionTitle(sectionTitle),
        looseLines: [],
        items: []
      });
      currentItem = undefined;
      continue;
    }

    const itemText = markerText(trimmedLine, itemMarkerPattern);

    if (itemText) {
      const section = ensureSection(sections);
      currentItem = {
        text: itemText,
        details: []
      };
      section.items.push(currentItem);
      continue;
    }

    const detailText = markerText(trimmedLine, detailMarkerPattern);

    if (detailText && currentItem) {
      currentItem.details.push(detailText);
      continue;
    }

    ensureSection(sections).looseLines.push(detailText ?? normalizeText(trimmedLine));
  }

  return sections;
}
