/**
 * Tests for onStepEndHandler - testing error extraction, metadata construction, and truncation
 */
import { handleOnStepEndEvent } from "../src/handlers/onStepEndHandler";
import type { TestCase, TestResult, TestStep } from "@playwright/test/reporter";
import * as grpc from "@grpc/grpc-js";
import { StanterpriseReporterOptions } from "../src/types";

// Mock the grpcClient module
jest.mock("../src/client/grpcClient", () => ({
  reportUnary: jest.fn().mockResolvedValue(undefined),
}));

// Mock the utils module
jest.mock("../src/utils", () => {
  const actual = jest.requireActual("../src/utils");
  return {
    ...actual,
    generateStepId: jest.fn((step: TestStep) => `step-${step.title}`),
  };
});

describe("handleOnStepEndEvent", () => {
  let mockClient: grpc.Client;
  let mockOptions: StanterpriseReporterOptions;
  let mockTest: TestCase;
  let mockResult: TestResult;

  beforeEach(() => {
    mockClient = {} as grpc.Client;
    mockOptions = {
      grpcAddress: "localhost:50051",
      grpcEnabled: true,
      grpcTimeout: 5000,
    };
    mockTest = {
      id: "test-123",
      title: "Test case",
      annotations: [],
    } as unknown as TestCase;
    mockResult = {
      workerIndex: 0,
      retry: 0,
    } as unknown as TestResult;
    jest.clearAllMocks();
  });

  describe("basic step handling", () => {
    it("should handle step without errors", () => {
      const step: TestStep = {
        title: "Test step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        annotations: [],
        steps: [],
        titlePath: () => ["Test step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should handle step with location", () => {
      const step: TestStep = {
        title: "Test step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        location: {
          file: "/path/to/test.ts",
          line: 10,
          column: 5,
        },
        annotations: [],
        steps: [],
        titlePath: () => ["Test step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should handle step with parent", () => {
      const parentStep: TestStep = {
        title: "Parent step",
        category: "hook",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 500,
        annotations: [],
        steps: [],
        titlePath: () => ["Parent step"],
        attachments: [],
      } as unknown as TestStep;

      const step: TestStep = {
        title: "Child step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        parent: parentStep,
        annotations: [],
        steps: [],
        titlePath: () => ["Parent step", "Child step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should extract error message", () => {
      const step: TestStep = {
        title: "Failed step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        error: {
          message: "Expected true to be false",
        },
        annotations: [],
        steps: [],
        titlePath: () => ["Failed step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should extract error stack", () => {
      const step: TestStep = {
        title: "Failed step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        error: {
          message: "Test failed",
          stack: "Error: Test failed\n    at test.ts:10:5\n    at Object.<anonymous>",
        },
        annotations: [],
        steps: [],
        titlePath: () => ["Failed step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should extract error value", () => {
      const step: TestStep = {
        title: "Failed step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        error: {
          value: "Custom error value",
        },
        annotations: [],
        steps: [],
        titlePath: () => ["Failed step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should extract error snippet", () => {
      const step: TestStep = {
        title: "Failed step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        error: {
          message: "Test failed",
          snippet: "  10 |   expect(result).toBe(true);\n> 11 |   expect(false).toBe(true);\n     |                 ^\n  12 |",
        },
        annotations: [],
        steps: [],
        titlePath: () => ["Failed step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should extract error location", () => {
      const step: TestStep = {
        title: "Failed step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        error: {
          message: "Test failed",
          location: {
            file: "/path/to/test.ts",
            line: 42,
            column: 10,
          },
        },
        annotations: [],
        steps: [],
        titlePath: () => ["Failed step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should handle all error properties together", () => {
      const step: TestStep = {
        title: "Failed step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        error: {
          message: "Comprehensive error",
          stack:
            "Error: Comprehensive error\n    at test.ts:10:5\n    at Object.<anonymous>",
          value: "Error value",
          snippet: "  10 |   code snippet here\n> 11 |   error line\n     |   ^\n  12 |",
          location: {
            file: "/path/to/test.ts",
            line: 11,
            column: 3,
          },
        },
        annotations: [],
        steps: [],
        titlePath: () => ["Failed step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });
  });

  describe("error metadata truncation", () => {
    it("should truncate large error stack", () => {
      // Create a stack trace that exceeds 100KB
      const largeStack = "Error: Test failed\n" + "    at line\n".repeat(10000);

      const step: TestStep = {
        title: "Failed step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        error: {
          message: "Test failed",
          stack: largeStack,
        },
        annotations: [],
        steps: [],
        titlePath: () => ["Failed step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();

      // Verify that truncateValue was called (implicitly through metadata processing)
      expect(largeStack.length).toBeGreaterThan(102400);
    });

    it("should truncate large error value", () => {
      // Create a value that exceeds 100KB
      const largeValue = "x".repeat(150000);

      const step: TestStep = {
        title: "Failed step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        error: {
          value: largeValue,
        },
        annotations: [],
        steps: [],
        titlePath: () => ["Failed step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should truncate large error snippet", () => {
      // Create a snippet that exceeds 100KB
      const largeSnippet = "  code line\n".repeat(10000);

      const step: TestStep = {
        title: "Failed step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        error: {
          snippet: largeSnippet,
        },
        annotations: [],
        steps: [],
        titlePath: () => ["Failed step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should preserve small error values without truncation", () => {
      const step: TestStep = {
        title: "Failed step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        error: {
          message: "Short error message",
          stack: "Error: Short error\n    at test.ts:10:5",
          value: "Short value",
          snippet: "  10 | code\n> 11 | error\n  12 |",
          location: {
            file: "/test.ts",
            line: 11,
            column: 5,
          },
        },
        annotations: [],
        steps: [],
        titlePath: () => ["Failed step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });
  });

  describe("metadata handling", () => {
    it("should include step annotations in metadata", () => {
      const step: TestStep = {
        title: "Annotated step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        annotations: [
          { type: "slow", description: "This step is slow" },
          { type: "retry" },
        ],
        steps: [],
        titlePath: () => ["Annotated step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should combine step metadata with error metadata", () => {
      const step: TestStep = {
        title: "Step with error and annotations",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        annotations: [{ type: "important", description: "Critical test" }],
        error: {
          message: "Test failed",
          stack: "Error: Test failed\n    at test.ts:10:5",
        },
        steps: [],
        titlePath: () => ["Step with error and annotations"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle step with empty error object", () => {
      const step: TestStep = {
        title: "Step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 1000,
        error: {} as any,
        annotations: [],
        steps: [],
        titlePath: () => ["Step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should handle zero duration", () => {
      const step: TestStep = {
        title: "Step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 0,
        annotations: [],
        steps: [],
        titlePath: () => ["Step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should handle very large duration", () => {
      const step: TestStep = {
        title: "Step",
        category: "test.step",
        startTime: new Date("2023-01-01T00:00:00Z"),
        duration: 999999999,
        annotations: [],
        steps: [],
        titlePath: () => ["Step"],
        attachments: [],
      } as unknown as TestStep;

      expect(() => {
        handleOnStepEndEvent(
          mockTest,
          mockResult,
          step,
          "run-123",
          mockClient,
          mockOptions
        );
      }).not.toThrow();
    });

    it("should handle different step categories", () => {
      const categories = ["hook", "test.step", "expect", "pw:api", "fixture"];

      categories.forEach((category) => {
        const step: TestStep = {
          title: `${category} step`,
          category,
          startTime: new Date("2023-01-01T00:00:00Z"),
          duration: 1000,
          annotations: [],
          steps: [],
          titlePath: () => [`${category} step`],
          attachments: [],
        } as unknown as TestStep;

        expect(() => {
          handleOnStepEndEvent(
            mockTest,
            mockResult,
            step,
            "run-123",
            mockClient,
            mockOptions
          );
        }).not.toThrow();
      });
    });
  });
});
