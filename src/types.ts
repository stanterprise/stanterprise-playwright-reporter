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
   * Number of retry attempts for gRPC calls
   * @default 3
   */
  grpcRetryAttempts?: number;

  /**
   * Base delay for gRPC retry backoff in milliseconds
   * @default 50
   */
  grpcRetryBaseDelayMs?: number;

  /**
   * Maximum delay for gRPC retry backoff in milliseconds
   * @default 300
   */
  grpcRetryMaxDelayMs?: number;

  /**
   * Jitter ratio for gRPC retry delays (0-1)
   * @default 0.2
   */
  grpcRetryJitter?: number;

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
