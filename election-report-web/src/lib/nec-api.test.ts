import { describe, expect, it } from "vitest";
import {
  buildNecApiUrl,
  getRequiredEnv,
  maskServiceKey
} from "./nec-api";

describe("nec api helpers", () => {
  it("requires configured environment values", () => {
    expect(() => getRequiredEnv({}, "DATA_GO_KR_SERVICE_KEY")).toThrow(
      "Missing required environment variable: DATA_GO_KR_SERVICE_KEY"
    );
    expect(getRequiredEnv({ DATA_GO_KR_SERVICE_KEY: "abc" }, "DATA_GO_KR_SERVICE_KEY")).toBe(
      "abc"
    );
  });

  it("builds official API URLs without exposing key in logs", () => {
    const url = buildNecApiUrl({
      baseUrl: "https://apis.data.go.kr/9760000/CommonCodeService",
      operation: "getCommonSgCodeList",
      serviceKey: "test-service-key",
      params: {
        pageNo: "1",
        numOfRows: "10",
        resultType: "json"
      }
    });

    expect(url.toString()).toBe(
      "https://apis.data.go.kr/9760000/CommonCodeService/getCommonSgCodeList?ServiceKey=test-service-key&pageNo=1&numOfRows=10&resultType=json"
    );
    expect(maskServiceKey(url.toString())).toContain("ServiceKey=***");
    expect(maskServiceKey(url.toString())).not.toContain("test-service-key");
  });
});
