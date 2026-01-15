/**
 * Unit tests for metadata helper functions
 */
import {
  buildAnnotationsMetadata,
  buildTestMetadata,
  buildStepMetadata,
  toMetadataMap,
} from "../src/utils/metadataHelpers";
import type { TestCase, TestResult, TestStep } from "@playwright/test/reporter";

describe("metadataHelpers", () => {
  describe("buildAnnotationsMetadata", () => {
    it("should build metadata from annotations with default prefix", () => {
      const annotations = [
        { type: "slow", description: "This test is slow" },
        { type: "flaky" },
      ];

      const metadata = buildAnnotationsMetadata(annotations);

      expect(metadata).toEqual({
        annotation_0_type: "slow",
        annotation_0_description: "This test is slow",
        annotation_1_type: "flaky",
      });
    });

    it("should build metadata with custom prefix", () => {
      const annotations = [{ type: "skip", description: "Skipped for now" }];

      const metadata = buildAnnotationsMetadata(
        annotations,
        "result_annotation"
      );

      expect(metadata).toEqual({
        result_annotation_0_type: "skip",
        result_annotation_0_description: "Skipped for now",
      });
    });

    it("should handle empty annotations array", () => {
      const metadata = buildAnnotationsMetadata([]);
      expect(metadata).toEqual({});
    });

    it("should skip description if not provided", () => {
      const annotations = [{ type: "slow" }];

      const metadata = buildAnnotationsMetadata(annotations);

      expect(metadata).toEqual({
        annotation_0_type: "slow",
      });
    });

    it("should truncate very large annotation descriptions", () => {
      // Create a description that's 200KB (over the 100KB limit)
      const largeDescription = "x".repeat(200000);
      const annotations = [{ type: "debug", description: largeDescription }];

      const metadata = buildAnnotationsMetadata(annotations);

      expect(metadata).toHaveProperty("annotation_0_type", "debug");
      expect(metadata).toHaveProperty("annotation_0_description");
      expect(metadata.annotation_0_description).toContain("[TRUNCATED:");
      expect(metadata.annotation_0_description.length).toBeLessThan(102500);
    });

    it("should handle multiple large annotations and respect total size limit", () => {
      // Create multiple annotations that would exceed 1MB total
      const largeDescription = "x".repeat(300000); // 300KB each
      const annotations = [
        { type: "debug1", description: largeDescription },
        { type: "debug2", description: largeDescription },
        { type: "debug3", description: largeDescription },
        { type: "debug4", description: largeDescription },
      ];

      const metadata = buildAnnotationsMetadata(annotations);

      // Should have all type keys
      expect(metadata).toHaveProperty("annotation_0_type");
      expect(metadata).toHaveProperty("annotation_1_type");
      expect(metadata).toHaveProperty("annotation_2_type");
      expect(metadata).toHaveProperty("annotation_3_type");

      // Some descriptions should be truncated or skipped
      const totalSize = Object.values(metadata).reduce(
        (sum, val) => sum + val.length,
        0
      );
      expect(totalSize).toBeLessThanOrEqual(1048576); // 1MB limit
    });

    it("should preserve small annotations without modification", () => {
      const annotations = [
        { type: "slow", description: "This test is slow" },
        { type: "retry", description: "Retry on failure" },
      ];

      const metadata = buildAnnotationsMetadata(annotations);

      expect(metadata).toEqual({
        annotation_0_type: "slow",
        annotation_0_description: "This test is slow",
        annotation_1_type: "retry",
        annotation_1_description: "Retry on failure",
      });
    });
  });

  describe("buildTestMetadata", () => {
    it("should combine test and result annotations", () => {
      const test = {
        annotations: [{ type: "slow", description: "Slow test" }],
      } as unknown as TestCase;

      const result = {
        annotations: [{ type: "retry", description: "Test was retried" }],
      } as unknown as TestResult;

      const metadata = buildTestMetadata(test, result);

      expect(metadata).toEqual({
        annotation_0_type: "slow",
        annotation_0_description: "Slow test",
        result_annotation_0_type: "retry",
        result_annotation_0_description: "Test was retried",
      });
    });

    it("should handle empty annotations", () => {
      const test = { annotations: [] } as unknown as TestCase;
      const result = { annotations: [] } as unknown as TestResult;

      const metadata = buildTestMetadata(test, result);

      expect(metadata).toEqual({});
    });

    it("should handle multiple annotations from both sources", () => {
      const test = {
        annotations: [
          { type: "slow" },
          { type: "browser", description: "chromium" },
        ],
      } as unknown as TestCase;

      const result = {
        annotations: [{ type: "retry" }],
      } as unknown as TestResult;

      const metadata = buildTestMetadata(test, result);

      expect(metadata).toEqual({
        annotation_0_type: "slow",
        annotation_1_type: "browser",
        annotation_1_description: "chromium",
        result_annotation_0_type: "retry",
      });
    });
  });

  describe("buildStepMetadata", () => {
    it("should build metadata with category and annotations", () => {
      const step = {
        category: "hook",
        annotations: [{ type: "beforeEach", description: "Setup" }],
      } as unknown as TestStep;

      const metadata = buildStepMetadata(step);

      expect(metadata).toEqual({
        category: "hook",
        annotation_0_type: "beforeEach",
        annotation_0_description: "Setup",
      });
    });

    it("should handle steps with no annotations", () => {
      const step = {
        category: "test.step",
        annotations: [],
      } as unknown as TestStep;

      const metadata = buildStepMetadata(step);

      expect(metadata).toEqual({
        category: "test.step",
      });
    });

    it("should handle different step categories", () => {
      const categories = ["hook", "test.step", "expect", "pw:api"];

      categories.forEach((category) => {
        const step = {
          category,
          annotations: [],
        } as unknown as TestStep;

        const metadata = buildStepMetadata(step);

        expect(metadata).toEqual({ category });
      });
    });
  });

  describe("toMetadataMap", () => {
    it("should convert object to Map", () => {
      const metadata = {
        key1: "value1",
        key2: "value2",
      };

      const map = toMetadataMap(metadata);

      expect(map).toBeInstanceOf(Map);
      expect(map.size).toBe(2);
      expect(map.get("key1")).toBe("value1");
      expect(map.get("key2")).toBe("value2");
    });

    it("should handle empty object", () => {
      const map = toMetadataMap({});

      expect(map).toBeInstanceOf(Map);
      expect(map.size).toBe(0);
    });

    it("should preserve all entries", () => {
      const metadata = {
        annotation_0_type: "slow",
        annotation_0_description: "This is slow",
        annotation_1_type: "flaky",
        category: "test.step",
      };

      const map = toMetadataMap(metadata);

      expect(map.size).toBe(4);
      expect(Array.from(map.entries())).toEqual(Object.entries(metadata));
    });

    it("should handle special characters in keys and values", () => {
      const metadata = {
        "special-key": "value with spaces",
        emoji_key: "🎉",
        unicode_key: "中文",
      };

      const map = toMetadataMap(metadata);

      expect(map.get("special-key")).toBe("value with spaces");
      expect(map.get("emoji_key")).toBe("🎉");
      expect(map.get("unicode_key")).toBe("中文");
    });
  });
});
