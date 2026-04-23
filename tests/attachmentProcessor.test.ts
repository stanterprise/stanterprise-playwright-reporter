/**
 * Unit tests for attachment processor
 */
import {
  processAttachments,
  extractErrorInfo,
} from "../src/utils/attachmentProcessor";
import type { TestResult, TestStep } from "@playwright/test/reporter";

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
        1 * 1024 * 1024,
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
        1 * 1024 * 1024,
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

  describe("processAttachments with TestStep", () => {
    it("should process attachments from TestStep with no attachments", () => {
      const step: Partial<TestStep> = {
        attachments: [],
      };

      const attachments = processAttachments(step as TestStep);
      expect(attachments).toHaveLength(0);
    });

    it("should process attachments from TestStep with undefined attachments", () => {
      const step: Partial<TestStep> = {};

      const attachments = processAttachments(step as TestStep);
      expect(attachments).toHaveLength(0);
    });

    it("should process TestStep attachment with path", () => {
      const step: Partial<TestStep> = {
        attachments: [
          {
            name: "step-screenshot",
            contentType: "image/png",
            path: "/path/to/step-screenshot.png",
          },
        ],
      };

      const attachments = processAttachments(step as TestStep);
      expect(attachments).toHaveLength(1);
      expect(attachments[0].name).toBe("step-screenshot");
      expect(attachments[0].mime_type).toBe("image/png");
      expect(attachments[0].uri).toBe("/path/to/step-screenshot.png");
      expect(attachments[0].content).toEqual(new Uint8Array());
    });

    it("should process TestStep attachment with body content", () => {
      const bodyContent = Buffer.from("step trace data");
      const step: Partial<TestStep> = {
        attachments: [
          {
            name: "step-trace",
            contentType: "application/zip",
            body: bodyContent,
          },
        ],
      };

      const attachments = processAttachments(step as TestStep);
      expect(attachments).toHaveLength(1);
      expect(attachments[0].name).toBe("step-trace");
      expect(attachments[0].mime_type).toBe("application/zip");
      expect(attachments[0].content).toEqual(bodyContent);
    });

    it("should process multiple TestStep attachments", () => {
      const step: Partial<TestStep> = {
        attachments: [
          {
            name: "step-screenshot1",
            contentType: "image/png",
            path: "/path/to/step-screenshot1.png",
          },
          {
            name: "step-screenshot2",
            contentType: "image/png",
            path: "/path/to/step-screenshot2.png",
          },
          {
            name: "step-log",
            contentType: "text/plain",
            body: Buffer.from("step log content"),
          },
        ],
      };

      const attachments = processAttachments(step as TestStep);
      expect(attachments).toHaveLength(3);
      expect(attachments[0].name).toBe("step-screenshot1");
      expect(attachments[1].name).toBe("step-screenshot2");
      expect(attachments[2].name).toBe("step-log");
    });

    it("should omit content for large TestStep attachment bodies", () => {
      // Create a 5MB body
      const largeBody = Buffer.alloc(5 * 1024 * 1024);
      const step: Partial<TestStep> = {
        attachments: [
          {
            name: "large-step-video",
            contentType: "video/webm",
            body: largeBody,
          },
        ],
      };

      // Use 1MB limit
      const attachments = processAttachments(step as TestStep, 1 * 1024 * 1024);
      expect(attachments).toHaveLength(1);
      expect(attachments[0].name).toBe("large-step-video");
      // Content should be empty when size limit is exceeded
      expect(attachments[0].content).toEqual(new Uint8Array());
    });

    it("should prefer path over body in TestStep attachments", () => {
      const bodyContent = Buffer.from("content");
      const step: Partial<TestStep> = {
        attachments: [
          {
            name: "step-screenshot",
            contentType: "image/png",
            path: "/path/to/step-file.png",
            body: bodyContent,
          },
        ],
      };

      const attachments = processAttachments(step as TestStep);
      expect(attachments).toHaveLength(1);
      expect(attachments[0].uri).toBe("/path/to/step-file.png");
      // Content should be empty when path is used
      expect(attachments[0].content).toEqual(new Uint8Array());
    });

    it("should respect total size limit for TestStep attachments", () => {
      // Create 3 attachments of 1MB each
      const attachment1MB = Buffer.alloc(1 * 1024 * 1024);
      const step: Partial<TestStep> = {
        attachments: [
          {
            name: "step-attachment1",
            contentType: "application/octet-stream",
            body: attachment1MB,
          },
          {
            name: "step-attachment2",
            contentType: "application/octet-stream",
            body: attachment1MB,
          },
          {
            name: "step-attachment3",
            contentType: "application/octet-stream",
            body: attachment1MB,
          },
        ],
      };

      const attachments = processAttachments(step as TestStep);

      // All 3 attachments should be present
      expect(attachments).toHaveLength(3);

      // First 2 should have content (within 2MB total limit)
      expect(attachments[0].content).toEqual(attachment1MB);
      expect(attachments[1].content).toEqual(attachment1MB);

      // Third should be skipped (would exceed 2MB limit)
      expect(attachments[2].content).toEqual(new Uint8Array());
    });

    it("should handle TestStep with mixed path and body attachments", () => {
      const bodyContent = Buffer.from("log data");
      const step: Partial<TestStep> = {
        attachments: [
          {
            name: "step-video",
            contentType: "video/webm",
            path: "/path/to/step-video.webm",
          },
          {
            name: "step-log",
            contentType: "text/plain",
            body: bodyContent,
          },
        ],
      };

      const attachments = processAttachments(step as TestStep);
      expect(attachments).toHaveLength(2);

      // Path attachment
      expect(attachments[0].uri).toBe("/path/to/step-video.webm");
      expect(attachments[0].content).toEqual(new Uint8Array());

      // Body attachment
      expect(attachments[1].content).toEqual(bodyContent);
    });

    it("should handle TestStep attachment with no path or body", () => {
      const step: Partial<TestStep> = {
        attachments: [
          {
            name: "empty-attachment",
            contentType: "application/octet-stream",
          },
        ],
      };

      const attachments = processAttachments(step as TestStep);
      expect(attachments).toHaveLength(1);
      expect(attachments[0].name).toBe("empty-attachment");
      expect(attachments[0].content).toEqual(new Uint8Array());
      expect(attachments[0].uri).toBe("");
    });

    it("should respect custom maxAttachmentSize for TestStep", () => {
      // Create a 500KB body
      const mediumBody = Buffer.alloc(500 * 1024);
      const step: Partial<TestStep> = {
        attachments: [
          {
            name: "medium-file",
            contentType: "application/octet-stream",
            body: mediumBody,
          },
        ],
      };

      // Use 256KB limit (smaller than body size)
      const attachments = processAttachments(step as TestStep, 256 * 1024);
      expect(attachments).toHaveLength(1);
      expect(attachments[0].content).toEqual(new Uint8Array());
    });

    it("should handle various content types in TestStep attachments", () => {
      const step: Partial<TestStep> = {
        attachments: [
          {
            name: "image",
            contentType: "image/png",
            body: Buffer.from("png data"),
          },
          {
            name: "video",
            contentType: "video/webm",
            path: "/path/to/video.webm",
          },
          {
            name: "trace",
            contentType: "application/zip",
            path: "/path/to/trace.zip",
          },
          {
            name: "log",
            contentType: "text/plain",
            body: Buffer.from("log content"),
          },
          {
            name: "json",
            contentType: "application/json",
            body: Buffer.from('{"data": "value"}'),
          },
        ],
      };

      const attachments = processAttachments(step as TestStep);
      expect(attachments).toHaveLength(5);
      expect(attachments[0].mime_type).toBe("image/png");
      expect(attachments[1].mime_type).toBe("video/webm");
      expect(attachments[2].mime_type).toBe("application/zip");
      expect(attachments[3].mime_type).toBe("text/plain");
      expect(attachments[4].mime_type).toBe("application/json");
    });
  });

  describe("extractErrorInfo", () => {
    it("should return empty values when no errors", () => {
      const result: Partial<TestResult> = {
        errors: [],
      };

      const { errorMessage, stackTrace, errors } = extractErrorInfo(
        result as TestResult,
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
        result as TestResult,
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
        result as TestResult,
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
        result as TestResult,
      );
      expect(errorMessage).toBe("");
      expect(stackTrace).toBe("");
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe("");
    });
  });
});
