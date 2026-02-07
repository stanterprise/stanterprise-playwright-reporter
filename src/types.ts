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
