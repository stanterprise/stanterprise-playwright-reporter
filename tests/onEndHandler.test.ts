/**
 * Tests for onEndHandler - specifically testing serialization edge cases
 */
import { handleOnEndEvent } from "../src/handlers/onEndHandler";
import { FullResult } from "@playwright/test/reporter";
import * as grpc from "@grpc/grpc-js";
import { StanterpriseReporterOptions } from "../src/types";

// Mock the grpcClient module
jest.mock("../src/client/grpcClient", () => ({
  reportUnary: jest.fn().mockResolvedValue(undefined),
}));

describe("handleOnEndEvent", () => {
  let mockClient: grpc.Client;
  let mockOptions: StanterpriseReporterOptions;

  beforeEach(() => {
    mockClient = {} as grpc.Client;
    mockOptions = {
      grpcAddress: "localhost:50051",
      grpcEnabled: true,
      grpcTimeout: 5000,
    };
    jest.clearAllMocks();
  });

  it("should handle valid FullResult", () => {
    const result: FullResult = {
      status: "passed",
      startTime: new Date("2023-01-01T00:00:00Z"),
      duration: 1000,
    };

    expect(() => {
      handleOnEndEvent(result, "test-run-id", mockClient, mockOptions);
    }).not.toThrow();
  });

  it("should handle undefined duration", () => {
    const result: FullResult = {
      status: "passed",
      startTime: new Date("2023-01-01T00:00:00Z"),
      duration: undefined as any,
    };

    // Should not throw - should use 0 as default
    expect(() => {
      handleOnEndEvent(result, "test-run-id", mockClient, mockOptions);
    }).not.toThrow();
  });

  it("should handle NaN duration", () => {
    const result: FullResult = {
      status: "passed",
      startTime: new Date("2023-01-01T00:00:00Z"),
      duration: NaN,
    };

    // Should not throw - should use 0 as default
    expect(() => {
      handleOnEndEvent(result, "test-run-id", mockClient, mockOptions);
    }).not.toThrow();
  });

  it("should handle negative duration", () => {
    const result: FullResult = {
      status: "passed",
      startTime: new Date("2023-01-01T00:00:00Z"),
      duration: -100,
    };

    // Should not throw - should use 0 as default
    expect(() => {
      handleOnEndEvent(result, "test-run-id", mockClient, mockOptions);
    }).not.toThrow();
  });

  it("should handle invalid startTime", () => {
    const result: FullResult = {
      status: "passed",
      startTime: new Date("invalid"),
      duration: 1000,
    };

    // Should not throw - should use Date.now() as default
    expect(() => {
      handleOnEndEvent(result, "test-run-id", mockClient, mockOptions);
    }).not.toThrow();
  });

  it("should handle undefined startTime", () => {
    const result: FullResult = {
      status: "passed",
      startTime: undefined as any,
      duration: 1000,
    };

    // Should not throw - should use Date.now() as default
    expect(() => {
      handleOnEndEvent(result, "test-run-id", mockClient, mockOptions);
    }).not.toThrow();
  });

  it("should handle all edge cases at once", () => {
    const result: FullResult = {
      status: "failed",
      startTime: undefined as any,
      duration: NaN,
    };

    // Should not throw - should use safe defaults
    expect(() => {
      handleOnEndEvent(result, "test-run-id", mockClient, mockOptions);
    }).not.toThrow();
  });

  it("should map test statuses correctly", () => {
    const statuses: FullResult["status"][] = [
      "passed",
      "failed",
      "timedout",
      "interrupted",
    ];

    statuses.forEach((status) => {
      const result: FullResult = {
        status,
        startTime: new Date(),
        duration: 1000,
      };

      expect(() => {
        handleOnEndEvent(result, "test-run-id", mockClient, mockOptions);
      }).not.toThrow();
    });
  });
});
