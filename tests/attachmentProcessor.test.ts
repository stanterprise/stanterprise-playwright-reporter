/**
 * Unit tests for attachment processor
 */
import {
  processAttachments,
  extractErrorInfo,
} from "../src/utils/attachmentProcessor";
import type { TestResult } from "@playwright/test/reporter";

describe("attachmentProcessor", () => {
  describe("processAttachments", () => {
    it("should return empty array when no attachments", () => {
      const result: Partial<TestResult> = {
        attachments: [],
      };

      const attachments = processAttachments(result as TestResult);
      expect(attachments).toHaveLength(0);
    });

    it("should return empty array when attachments is undefined", () => {
      const result: Partial<TestResult> = {};

      const attachments = processAttachments(result as TestResult);
      expect(attachments).toHaveLength(0);
    });

    it("should process attachments with path", () => {
      const result: Partial<TestResult> = {
        attachments: [
          {
            name: "screenshot",
            contentType: "image/png",
            path: "/path/to/screenshot.png",
          },
        ],
      };

      const attachments = processAttachments(result as TestResult);
      expect(attachments).toHaveLength(1);
      expect(attachments[0].name).toBe("screenshot");
      expect(attachments[0].mime_type).toBe("image/png");
      expect(attachments[0].uri).toBe("/path/to/screenshot.png");
    });

    it("should process attachments with body content", () => {
      const bodyContent = Buffer.from("test content");
      const result: Partial<TestResult> = {
        attachments: [
          {
            name: "trace",
            contentType: "application/zip",
            body: bodyContent,
          },
        ],
      };

      const attachments = processAttachments(result as TestResult);
      expect(attachments).toHaveLength(1);
      expect(attachments[0].name).toBe("trace");
      expect(attachments[0].mime_type).toBe("application/zip");
      expect(attachments[0].content).toEqual(bodyContent);
    });

    it("should process multiple attachments", () => {
      const result: Partial<TestResult> = {
        attachments: [
          {
            name: "screenshot1",
            contentType: "image/png",
            path: "/path/to/screenshot1.png",
          },
          {
            name: "screenshot2",
            contentType: "image/png",
            path: "/path/to/screenshot2.png",
          },
        ],
      };

      const attachments = processAttachments(result as TestResult);
      expect(attachments).toHaveLength(2);
    });

    it("should omit content for large attachment bodies that exceed size limit", () => {
      // Create a 5MB body
      const largeBody = Buffer.alloc(5 * 1024 * 1024);
      const result: Partial<TestResult> = {
        attachments: [
          {
            name: "large-video",
            contentType: "video/webm",
            body: largeBody,
          },
        ],
      };

      // Use 1MB limit
      const attachments = processAttachments(
        result as TestResult,
        1 * 1024 * 1024
      );
      expect(attachments).toHaveLength(1);
      expect(attachments[0].name).toBe("large-video");
      // Content should be empty/not set when size limit is exceeded
      expect(attachments[0].content).toEqual(new Uint8Array());
      expect(attachments[0].uri).toBe("");
    });

    it("should include small attachment bodies within size limit", () => {
      // Create a 500KB body
      const smallBody = Buffer.alloc(500 * 1024);
      const result: Partial<TestResult> = {
        attachments: [
          {
            name: "small-screenshot",
            contentType: "image/png",
            body: smallBody,
          },
        ],
      };

      // Use 1MB limit
      const attachments = processAttachments(
        result as TestResult,
        1 * 1024 * 1024
      );
      expect(attachments).toHaveLength(1);
      expect(attachments[0].name).toBe("small-screenshot");
      expect(attachments[0].content).toEqual(smallBody);
    });

    it("should prefer path over body even for small attachments", () => {
      const smallBody = Buffer.alloc(100);
      const result: Partial<TestResult> = {
        attachments: [
          {
            name: "screenshot",
            contentType: "image/png",
            path: "/path/to/file.png",
            body: smallBody,
          },
        ],
      };

      const attachments = processAttachments(result as TestResult);
      expect(attachments).toHaveLength(1);
      expect(attachments[0].uri).toBe("/path/to/file.png");
      // Content should be empty when path is used
      expect(attachments[0].content).toEqual(new Uint8Array());
    });

    it("should respect total attachment size limit across multiple attachments", () => {
      // Create 3 attachments of 1MB each = 3MB total
      // With 2MB total limit, some should be skipped
      const attachment1MB = Buffer.alloc(1 * 1024 * 1024);
      const result: Partial<TestResult> = {
        attachments: [
          {
            name: "attachment1",
            contentType: "application/octet-stream",
            body: attachment1MB,
          },
          {
            name: "attachment2",
            contentType: "application/octet-stream",
            body: attachment1MB,
          },
          {
            name: "attachment3",
            contentType: "application/octet-stream",
            body: attachment1MB,
          },
        ],
      };

      const attachments = processAttachments(result as TestResult);

      // All 3 attachments should be present (metadata)
      expect(attachments).toHaveLength(3);

      // First 2 should have content (within 2MB total limit)
      expect(attachments[0].content).toEqual(attachment1MB);
      expect(attachments[1].content).toEqual(attachment1MB);

      // Third should be skipped (would exceed 2MB limit)
      expect(attachments[2].content).toEqual(new Uint8Array());
    });

    it("should handle mix of path and body attachments with size limits", () => {
      const largeBody = Buffer.alloc(1.5 * 1024 * 1024); // 1.5MB
      const result: Partial<TestResult> = {
        attachments: [
          {
            name: "video-with-path",
            contentType: "video/webm",
            path: "/path/to/video.webm",
          },
          {
            name: "large-trace",
            contentType: "application/zip",
            body: largeBody,
          },
        ],
      };

      const attachments = processAttachments(result as TestResult);

      expect(attachments).toHaveLength(2);

      // Path attachment should always work
      expect(attachments[0].uri).toBe("/path/to/video.webm");

      // Large body should be skipped (exceeds 1MB default)
      expect(attachments[1].content).toEqual(new Uint8Array());
    });
  });

  describe("extractErrorInfo", () => {
    it("should return empty values when no errors", () => {
      const result: Partial<TestResult> = {
        errors: [],
      };

      const { errorMessage, stackTrace, errors } = extractErrorInfo(
        result as TestResult
      );
      expect(errorMessage).toBe("");
      expect(stackTrace).toBe("");
      expect(errors).toHaveLength(0);
    });

    it("should extract error message and stack trace", () => {
      const result: Partial<TestResult> = {
        errors: [
          {
            message: "Test failed",
            stack: "Error: Test failed\n    at test.ts:10:5",
          },
        ],
      };

      const { errorMessage, stackTrace, errors } = extractErrorInfo(
        result as TestResult
      );
      expect(errorMessage).toBe("Test failed");
      expect(stackTrace).toBe("Error: Test failed\n    at test.ts:10:5");
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe("Test failed");
    });

    it("should handle multiple errors", () => {
      const result: Partial<TestResult> = {
        errors: [
          {
            message: "Error 1",
            stack: "Stack 1",
          },
          {
            message: "Error 2",
            stack: "Stack 2",
          },
        ],
      };

      const { errorMessage, stackTrace, errors } = extractErrorInfo(
        result as TestResult
      );
      expect(errorMessage).toBe("Error 1\nError 2");
      expect(stackTrace).toBe("Stack 1\nStack 2");
      expect(errors).toHaveLength(2);
    });

    it("should handle errors with missing message or stack", () => {
      const result: Partial<TestResult> = {
        errors: [
          {
            message: undefined as any,
            stack: undefined as any,
          },
        ],
      };

      const { errorMessage, stackTrace, errors } = extractErrorInfo(
        result as TestResult
      );
      expect(errorMessage).toBe("");
      expect(stackTrace).toBe("");
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe("");
    });
  });
});
