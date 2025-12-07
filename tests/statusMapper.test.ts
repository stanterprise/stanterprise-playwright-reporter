/**
 * Unit tests for utility functions
 */
import { mapTestStatus, mapStepStatus } from "../src/utils/statusMapper";
import { common } from "@stanterprise/protobuf";

const TestStatus = common.v1.common.TestStatus;

describe("statusMapper", () => {
  describe("mapTestStatus", () => {
    it("should map 'passed' status correctly", () => {
      expect(mapTestStatus("passed")).toBe(TestStatus.PASSED);
    });

    it("should map 'failed' status correctly", () => {
      expect(mapTestStatus("failed")).toBe(TestStatus.FAILED);
    });

    it("should map 'skipped' status correctly", () => {
      expect(mapTestStatus("skipped")).toBe(TestStatus.SKIPPED);
    });

    it("should map 'timedOut' status to FAILED", () => {
      expect(mapTestStatus("timedOut")).toBe(TestStatus.FAILED);
    });

    it("should map 'interrupted' status to UNKNOWN", () => {
      expect(mapTestStatus("interrupted")).toBe(TestStatus.UNKNOWN);
    });

    it("should handle unknown status gracefully", () => {
      expect(mapTestStatus("unknown" as any)).toBe(TestStatus.UNKNOWN);
    });
  });

  describe("mapStepStatus", () => {
    it("should return FAILED when hasError is true", () => {
      expect(mapStepStatus(true)).toBe(TestStatus.FAILED);
    });

    it("should return PASSED when hasError is false", () => {
      expect(mapStepStatus(false)).toBe(TestStatus.PASSED);
    });
  });
});
