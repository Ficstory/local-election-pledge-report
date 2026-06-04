import { describe, expect, it } from "vitest";

import { parsePledgeContent } from "./pledge-content";

describe("parsePledgeContent", () => {
  it("groups official pledge markers into sections, items, and detail lines", () => {
    const content = [
      "□ 목 표",
      "  ○ 내 집 앞 10분 역세권부터, 30분 국제공항세권까지 조성",
      "",
      "□ 이행방법",
      "  ○ 대구 어디서나 도시철도가 닿는 내 집 앞 10분 역세권도시 조성",
      "    - 도시철도 3호선 신서혁신도시 연장선 건설 추진",
      "    - 도시철도 4호선(엑스코선) 조속 추진",
      "  ○ 대구형 대중교통비 환급 제도 「대구로패스」를 신설",
      "    - 월 4만5천 원을 초과하는 대중교통비를 대구로페이로 전액 환급"
    ].join("\n");

    expect(parsePledgeContent(content)).toEqual([
      {
        title: "목표",
        looseLines: [],
        items: [
          {
            text: "내 집 앞 10분 역세권부터, 30분 국제공항세권까지 조성",
            details: []
          }
        ]
      },
      {
        title: "이행방법",
        looseLines: [],
        items: [
          {
            text: "대구 어디서나 도시철도가 닿는 내 집 앞 10분 역세권도시 조성",
            details: [
              "도시철도 3호선 신서혁신도시 연장선 건설 추진",
              "도시철도 4호선(엑스코선) 조속 추진"
            ]
          },
          {
            text: "대구형 대중교통비 환급 제도 「대구로패스」를 신설",
            details: [
              "월 4만5천 원을 초과하는 대중교통비를 대구로페이로 전액 환급"
            ]
          }
        ]
      }
    ]);
  });

  it("keeps unmarked content visible in a fallback section", () => {
    expect(parsePledgeContent("첫 줄\n둘째 줄")).toEqual([
      {
        title: "원문",
        looseLines: ["첫 줄", "둘째 줄"],
        items: []
      }
    ]);
  });
});
