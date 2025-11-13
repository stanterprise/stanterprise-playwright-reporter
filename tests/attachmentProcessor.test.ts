/**
 * Unit tests for attachment processor
 */
import { processAttachments, extractErrorInfo } from "../src/utils/attachmentProcessor";
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
  });

  describe("extractErrorInfo", () => {
    it("should return empty values when no errors", () => {
      const result: Partial<TestResult> = {
        errors: [],
      };

      const { errorMessage, stackTrace, errors } = extractErrorInfo(result as TestResult);
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

      const { errorMessage, stackTrace, errors } = extractErrorInfo(result as TestResult);
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

      const { errorMessage, stackTrace, errors } = extractErrorInfo(result as TestResult);
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

      const { errorMessage, stackTrace, errors } = extractErrorInfo(result as TestResult);
      expect(errorMessage).toBe("");
      expect(stackTrace).toBe("");
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe("");
    });
  });
});
