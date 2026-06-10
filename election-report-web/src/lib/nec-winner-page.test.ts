import { describe, expect, it } from "vitest";

import {
  buildWinnerPageRequestParams,
  buildWinnerStatementId,
  parseNecWinnerPage
} from "./nec-winner-page";

describe("buildWinnerPageRequestParams", () => {
  it("builds the education superintendent winner page query", () => {
    const params = buildWinnerPageRequestParams({
      electionId: "20260603",
      sgTypecode: "11"
    });

    expect(params.get("electionId")).toBe("0020260603");
    expect(params.get("electionName")).toBe("20260603");
    expect(params.get("electionCode")).toBe("11");
    expect(params.get("statementId")).toBe("EPEI01_#11");
    expect(params.get("requestURI")).toBe(
      "/electioninfo/0020260603/ep/epei01.jsp"
    );
  });

  it("maps the statement id from the election type code", () => {
    expect(buildWinnerStatementId("3")).toBe("EPEI01_#3");
    expect(buildWinnerStatementId("11")).toBe("EPEI01_#11");
  });
});

describe("parseNecWinnerPage", () => {
  it("parses winner rows and candidate API IDs from photo paths", () => {
    const html = `
      <table id="table01">
        <tr>
          <th>선거구명</th><th>사진</th><th>성명</th><th>성별</th>
          <th>생년월일</th><th>주소</th><th>직업</th><th>학력</th><th>경력</th><th>득표수</th>
        </tr>
        <tr>
          <td class="firstTd alignL">서울특별시</td>
          <td>
            <input type="image" src="/photo_20260603/Gsg1100/Hb100161493/gicho/thumbnail.100161493.JPG" />
          </td>
          <td>정근식<br/><span class="hanja">(鄭根埴)</span></td>
          <td>남</td>
          <td>1957.11.15<br/>(68세)</td>
          <td>서울특별시 서초구 효령로</td>
          <td>서울특별시교육감</td>
          <td>서울대학교 대학원 사회학과 문학박사</td>
          <td>(현)서울특별시교육감<br/>(전)교수</td>
          <td>1,509,528<br/>(30.26)</td>
        </tr>
      </table>
    `;

    expect(parseNecWinnerPage(html)).toEqual([
      {
        address: "서울특별시 서초구 효령로",
        birthDate: "1957.11.15",
        candidateApiId: "100161493",
        career: "(현)서울특별시교육감 / (전)교수",
        education: "서울대학교 대학원 사회학과 문학박사",
        gender: "남",
        hanjaName: "鄭根埴",
        job: "서울특별시교육감",
        name: "정근식",
        partyName: undefined,
        regionName: "서울특별시",
        voteCount: 1509528,
        voteRate: "30.26"
      }
    ]);
  });

  it("skips rows without a stable candidate API ID", () => {
    const html = `
      <table id="table01">
        <tr><th>선거구명</th><th>사진</th><th>성명</th></tr>
        <tr><td>서울특별시</td><td></td><td>정근식</td></tr>
      </table>
    `;

    expect(parseNecWinnerPage(html)).toEqual([]);
  });

  it("parses winner tables with a party column", () => {
    const html = `
      <table id="table01">
        <tr>
          <th>선거구명</th><th>정당명</th><th>사진</th><th>성명</th><th>성별</th>
          <th>생년월일</th><th>주소</th><th>직업</th><th>학력</th><th>경력</th><th>득표수</th>
        </tr>
        <tr>
          <td>서울특별시</td>
          <td>국민의힘</td>
          <td><input type="image" src="/photo_20260603/Gsg1100/Hb100162984/gicho/thumbnail.100162984.JPG" /></td>
          <td>오세훈<br/><span class="hanja">(吳世勳)</span></td>
          <td>남</td>
          <td>1961.01.04<br/>(65세)</td>
          <td>서울특별시 용산구 한남대로</td>
          <td>서울특별시장</td>
          <td>고려대학교 대학원 법학과 졸업</td>
          <td>(현)서울특별시장<br/>(전)국회의원</td>
          <td>2,575,819<br/>(49.22)</td>
        </tr>
      </table>
    `;

    expect(parseNecWinnerPage(html)).toEqual([
      {
        address: "서울특별시 용산구 한남대로",
        birthDate: "1961.01.04",
        candidateApiId: "100162984",
        career: "(현)서울특별시장 / (전)국회의원",
        education: "고려대학교 대학원 법학과 졸업",
        gender: "남",
        hanjaName: "吳世勳",
        job: "서울특별시장",
        name: "오세훈",
        partyName: "국민의힘",
        regionName: "서울특별시",
        voteCount: 2575819,
        voteRate: "49.22"
      }
    ]);
  });
});
