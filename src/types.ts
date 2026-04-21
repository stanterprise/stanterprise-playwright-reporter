/**
 * Type definitions for Stanterprise Playwright Reporter
 */

/**
 * Configuration options for the Stanterprise Reporter
 */
export interface StanterpriseReporterOptions {
  /**
   * gRPC server address
   * @default "localhost:50051" or process.env.STANTERPRISE_GRPC_ADDRESS
   */
  grpcAddress?: string;

  /**
   * Optional separate host and port for gRPC, which override the host and port parts of grpcAddress if provided.
   * This allows specifying gRPC connection details separately from other potential uses of grpcAddress.
   */
  grpcHost?: string; // Optional separate host for gRPC, overrides host part of grpcAddress if provided

  /**
   * Optional separate port for gRPC, which overrides the port part of grpcAddress if provided.
   * This allows specifying gRPC connection details separately from other potential uses of grpcAddress.
   * @default 50051
   */
  grpcPort?: number; // Optional separate port for gRPC, overrides port part of grpcAddress if provided

  /**
   * Whether gRPC reporting is enabled
   * @default true or process.env.STANTERPRISE_GRPC_ENABLED !== "false"
   */
  grpcEnabled?: boolean;

  /**
   * Timeout for gRPC calls in milliseconds
   * @default 1000
   */
  grpcTimeout?: number;

  /**
   * Maximum message size for gRPC calls in bytes
   * @default 104857600 (100MB)
   */
  grpcMaxMessageSize?: number;

  /**
   * Maximum size for attachment content in bytes
   * Attachments larger than this will only include the path reference
   * @default 10485760 (10MB)
   */
  maxAttachmentSize?: number;

  /**
   * Whether to include verbose logging
   * @default false
   */
  verbose?: boolean;

  /**
   * Maximum number of retry attempts for failed gRPC calls
   * @default 3
   */
  grpcMaxRetries?: number;

  /**
   * Initial delay between retry attempts in milliseconds
   * Actual delay uses exponential backoff: initialDelay * (2 ^ attemptNumber)
   * @default 100
   */
  grpcRetryDelay?: number;

  /**
   * Whether to enable debug mode, which writes all outgoing gRPC messages to a JSONL file.
   * Warning: debug output may include full request payloads, including attachment content
   * and metadata, which can contain sensitive values. Debug files may also grow very large.
   * Enable this only for troubleshooting in controlled environments.
   * @default false or process.env.STANTERPRISE_DEBUG === "true"
   */
  debug?: boolean;

  /**
   * File path for debug JSONL output when debug mode is enabled.
   * Warning: the file may contain sensitive request data and can become very large,
   * especially when attachments are included. Use only in controlled environments and
   * handle the output file securely.
   * @default "stanterprise-debug.jsonl" or process.env.STANTERPRISE_DEBUG_FILE
   */
  debugFile?: string;
}

/**
 * Internal type for managing test execution state
 */
export interface TestExecutionContext {
  /**
   * Unique ID combining run ID and test ID
   */
  uniqueTestExecutionId: string;

  /**
   * The global run ID for this test execution
   */
  runId: string;

  /**
   * The test ID from Playwright
   */
  testId: string;
}

/**
 * Internal type for managing step execution state
 */
export interface StepExecutionContext extends TestExecutionContext {
  /**
   * Unique ID for the step
   */
  uniqueStepId: string;

  /**
   * Step title
   */
  stepTitle: string;

  /**
   * Step start time
   */
  stepStartTime: Date;
}
