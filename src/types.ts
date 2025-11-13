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
