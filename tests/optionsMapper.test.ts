/**
 * Tests for options mapper to ensure all options are preserved
 */
import defineOptions from "../src/utils/optionsMapper";
import { StanterpriseReporterOptions } from "../src/types";

describe("defineOptions", () => {
  beforeEach(() => {
    // Clear any environment variables that might affect tests
    delete process.env.STANTERPRISE_GRPC_ADDRESS;
    delete process.env.STANTERPRISE_GRPC_ENABLED;
    delete process.env.STANTERPRISE_DEBUG;
    delete process.env.STANTERPRISE_DEBUG_FILE;
  });

  it("should apply default values for all options", () => {
    const result = defineOptions({});

    expect(result.grpcAddress).toBe("localhost:50051");
    expect(result.grpcEnabled).toBe(true);
    expect(result.grpcTimeout).toBe(1000);
    expect(result.grpcMaxMessageSize).toBe(104857600);
    expect(result.maxAttachmentSize).toBe(10485760);
    expect(result.verbose).toBe(false);
    expect(result.grpcMaxRetries).toBe(3);
    expect(result.grpcRetryDelay).toBe(100);
    expect(result.debug).toBe(false);
    expect(result.debugFile).toBe("stanterprise-debug.jsonl");
  });

  it("should preserve user-provided retry options", () => {
    const result = defineOptions({
      grpcMaxRetries: 5,
      grpcRetryDelay: 200,
    });

    expect(result.grpcMaxRetries).toBe(5);
    expect(result.grpcRetryDelay).toBe(200);
  });

  it("should preserve all user-provided options", () => {
    const providedOptions: StanterpriseReporterOptions = {
      grpcAddress: "example.com:50051",
      grpcEnabled: false,
      grpcTimeout: 2000,
      grpcMaxMessageSize: 200000000,
      maxAttachmentSize: 20000000,
      verbose: true,
      grpcMaxRetries: 10,
      grpcRetryDelay: 500,
    };

    const result = defineOptions(providedOptions);

    expect(result.grpcAddress).toBe("example.com:50051");
    expect(result.grpcEnabled).toBe(false);
    expect(result.grpcTimeout).toBe(2000);
    expect(result.grpcMaxMessageSize).toBe(200000000);
    expect(result.maxAttachmentSize).toBe(20000000);
    expect(result.verbose).toBe(true);
    expect(result.grpcMaxRetries).toBe(10);
    expect(result.grpcRetryDelay).toBe(500);
  });

  it("should use environment variables when options not provided", () => {
    process.env.STANTERPRISE_GRPC_ADDRESS = "env-server.com:50051";
    process.env.STANTERPRISE_GRPC_ENABLED = "false";

    const result = defineOptions({});

    expect(result.grpcAddress).toBe("env-server.com:50051");
    expect(result.grpcEnabled).toBe(false);
  });

  it("should prefer provided options over environment variables", () => {
    process.env.STANTERPRISE_GRPC_ADDRESS = "env-server.com:50051";
    process.env.STANTERPRISE_GRPC_ENABLED = "false";

    const result = defineOptions({
      grpcAddress: "config-server.com:50051",
      grpcEnabled: true,
    });

    expect(result.grpcAddress).toBe("config-server.com:50051");
    expect(result.grpcEnabled).toBe(true);
  });

  it("should handle grpcMaxRetries of 0", () => {
    const result = defineOptions({
      grpcMaxRetries: 0,
    });

    expect(result.grpcMaxRetries).toBe(0);
  });

  it("should use nullish coalescing for grpcMaxRetries to support 0 value", () => {
    // Test that 0 is preserved (not replaced with default)
    const result1 = defineOptions({ grpcMaxRetries: 0 });
    expect(result1.grpcMaxRetries).toBe(0);

    // Test that undefined gets default
    const result2 = defineOptions({});
    expect(result2.grpcMaxRetries).toBe(3);
  });

  it("should default debug to false and debugFile to stanterprise-debug.jsonl", () => {
    const result = defineOptions({});

    expect(result.debug).toBe(false);
    expect(result.debugFile).toBe("stanterprise-debug.jsonl");
  });

  it("should enable debug via provided option", () => {
    const result = defineOptions({ debug: true, debugFile: "my-debug.jsonl" });

    expect(result.debug).toBe(true);
    expect(result.debugFile).toBe("my-debug.jsonl");
  });

  it("should enable debug via STANTERPRISE_DEBUG environment variable", () => {
    process.env.STANTERPRISE_DEBUG = "true";

    const result = defineOptions({});

    expect(result.debug).toBe(true);
  });

  it("should set debugFile via STANTERPRISE_DEBUG_FILE environment variable", () => {
    process.env.STANTERPRISE_DEBUG_FILE = "env-debug.jsonl";

    const result = defineOptions({});

    expect(result.debugFile).toBe("env-debug.jsonl");
  });

  it("should prefer provided debug options over environment variables", () => {
    process.env.STANTERPRISE_DEBUG = "true";
    process.env.STANTERPRISE_DEBUG_FILE = "env-debug.jsonl";

    const result = defineOptions({ debug: false, debugFile: "config-debug.jsonl" });

    expect(result.debug).toBe(false);
    expect(result.debugFile).toBe("config-debug.jsonl");
  });
});
