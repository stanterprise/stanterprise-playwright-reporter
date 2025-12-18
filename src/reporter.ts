import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
  TestStep,
  TestError,
} from "@playwright/test/reporter";
import { events, testCase, testSuite, common } from "@stanterprise/protobuf";
import * as grpc from "@grpc/grpc-js";
import { randomUUID } from "crypto";
import { StanterpriseReporterOptions } from "./types";
import {
  mapTestStatus,
  mapStepStatus,
  processAttachments,
  extractErrorInfo,
  createTimestamp,
  createTimestampFromMs,
  createDuration,
} from "./utils";

// Create shortcuts for the protobuf classes
const EventsNS = events.v1.events;
const TestCaseEntities = testCase.v1.entities;
const TestSuiteEntities = testSuite.v1.entities;
const TestStatus = common.v1.common.TestStatus;

export default class StanterpriseReporter implements Reporter {
  // Generic gRPC client (we call unary methods by path directly).
  private grpcClient: grpc.Client | null = null;
  private grpcAddress: string;
  private grpcEnabled: boolean;
  private grpcTimeout: number;
  private grpcFirstErrorLogged = false;
  private verbose: boolean;

  // Generate a unique run ID for this test run
  private runId: string = "";
  private runStartTime: Date = new Date();
  private rootSuite: Suite | null = null;
  // Track reported suites to ensure we only report each suite once and can reference correct IDs
  private reportedSuites: Map<Suite, string> = new Map();
  // Track suite start times for accurate duration calculation
  private suiteTimes: Map<Suite, Date> = new Map();

  constructor(options: StanterpriseReporterOptions = {}) {
    this.grpcAddress =
      options.grpcAddress ||
      process.env.STANTERPRISE_GRPC_ADDRESS ||
      "localhost:50051";
    this.grpcEnabled =
      options.grpcEnabled ??
      (process.env.STANTERPRISE_GRPC_ENABLED || "true").toLowerCase() !==
        "false";
    this.grpcTimeout = options.grpcTimeout || 1000;
    this.verbose = options.verbose || false;

    if (this.verbose) {
      console.log("Stanterprise Reporter: Initialized with options:", {
        grpcAddress: this.grpcAddress,
        grpcEnabled: this.grpcEnabled,
        grpcTimeout: this.grpcTimeout,
        verbose: this.verbose,
      });
    }
  }

  onBegin(config: FullConfig, suite: Suite): void {
    // Generate a UUID for runId
    this.runId = randomUUID();
    this.rootSuite = suite;

    // Lazily create the client if enabled.
    if (this.grpcEnabled) {
      try {
        this.grpcClient = new grpc.Client(
          this.grpcAddress,
          grpc.credentials.createInsecure()
        );
      } catch (e) {
        this.logGrpcErrorOnce("Failed to create gRPC client", e);
      }
    } else {
      if (this.verbose) {
        console.log(
          "Stanterprise Reporter: gRPC disabled via STANTERPRISE_GRPC_ENABLED=false"
        );
      }
    }
    if (this.verbose) {
      console.log(
        `Stanterprise Reporter: Test run started with ID: ${this.runId}`
      );
      console.log(`Number of tests: ${suite.allTests().length}`);
      console.log(`Run started at: ${this.runStartTime.toISOString()}`);
    }
    // Report root suite and all child suites recursively
    this.reportSuiteTreeBegin(suite);
  }

  async onExit(): Promise<void> {
    console.log(
      `Stanterprise Reporter: Test run completed - Run ID: ${this.runId}`
    );
    // Cleanup gRPC client
    try {
      this.grpcClient?.close();
    } catch (e) {
      console.error(
        "Stanterprise Reporter: Error during gRPC client cleanup in onExit:",
        e
      );
    }
  }

  // Getter to access the current run ID
  public getRunId(): string {
    return this.runId;
  }

  // Getter to access the run start time
  public getRunStartTime(): Date {
    return this.runStartTime;
  }

  onEnd(
    result: FullResult
  ): Promise<{ status?: FullResult["status"] } | undefined | void> | void {
    const runDuration = Date.now() - this.runStartTime.getTime();

    console.log(
      `Stanterprise Reporter: Test run ended - Run ID: ${this.runId}`
    );
    console.log(`Final result: ${result.status}`);
    console.log(
      `Run duration: ${runDuration}ms (Playwright duration: ${result.duration}ms)`
    );
    console.log(`Run start time: ${this.runStartTime.toISOString()}`);
    console.log(`Playwright start time: ${result.startTime.toISOString()}`);

    // Report all suites end (from leaves to root)
    if (this.rootSuite) {
      this.reportSuiteTreeEnd(this.rootSuite, result);
    }

    return Promise.resolve();
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    // Create unique test execution ID combining run ID and test ID
    const uniqueTestExecutionId = `${this.runId}-${test.id}`;

    console.log(`Stanterprise Reporter: Test started - ${test.title}`);
    console.log(`  Run ID: ${this.runId}`);
    console.log(`  Test ID (static): ${test.id}`);
    console.log(`  Unique Execution ID: ${uniqueTestExecutionId}`);

    // Get test suite run ID from parent suite if available, ensuring suite is reported
    const testSuiteRunId = test.parent ? this.getSuiteId(test.parent) : "";

    // Build metadata from test annotations
    const metadata = new Map<string, string>();
    test.annotations.forEach((annotation, index) => {
      metadata.set(`annotation_${index}_type`, annotation.type);
      if (annotation.description) {
        metadata.set(`annotation_${index}_description`, annotation.description);
      }
    });

    // Build and send the TestBegin event via generic unary call.
    const request = new EventsNS.TestBeginEventRequest({
      test_case: new TestCaseEntities.TestCaseRun({
        id: test.id,
        name: test.title,
        run_id: this.runId,
        test_suite_run_id: testSuiteRunId,
        start_time: createTimestamp(result.startTime),
        metadata: metadata,
        tags: test.tags,
      }),
    });

    // Fire-and-forget to avoid slowing tests; log errors once.
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportTestBegin",
      request,
      this.grpcTimeout
    ).catch((e) => this.logGrpcErrorOnce("Failed to report test begin", e));
  }

  async onStepBegin(
    test: TestCase,
    result: TestResult,
    step: TestStep
  ): Promise<void> {
    const uniqueTestExecutionId = `${this.runId}-${test.id}`;
    const uniqueStepId = `${uniqueTestExecutionId}-${
      step.title
    }-${step.startTime.getTime()}`;

    console.log(`Stanterprise Reporter: Step started - ${step.title}`);
    console.log(`  Category: ${step.category}`);

    // Build metadata from step annotations
    const metadata = new Map<string, string>();
    metadata.set("category", step.category);
    step.annotations.forEach((annotation, index) => {
      metadata.set(`annotation_${index}_type`, annotation.type);
      if (annotation.description) {
        metadata.set(`annotation_${index}_description`, annotation.description);
      }
    });

    // Get parent step ID if this step has a parent
    const parentStepId = step.parent
      ? `${uniqueTestExecutionId}-${
          step.parent.title
        }-${step.parent.startTime.getTime()}`
      : "";

    // Build and send the StepBegin event
    const request = new EventsNS.StepBeginEventRequest({
      step: new TestCaseEntities.StepRun({
        id: uniqueStepId,
        run_id: this.runId,
        test_case_run_id: uniqueTestExecutionId,
        title: step.title,
        type: step.category,
        start_time: createTimestamp(step.startTime),
        location: step.location
          ? `${step.location.file}:${step.location.line}:${step.location.column}`
          : "",
        metadata: metadata,
        parent_step_id: parentStepId,
        worker_index: result.workerIndex.toString(),
      }),
    });

    // Fire-and-forget to avoid slowing tests
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportStepBegin",
      request,
      this.grpcTimeout
    ).catch((e) => this.logGrpcErrorOnce("Failed to report step begin", e));
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
    const uniqueTestExecutionId = `${this.runId}-${test.id}`;
    const uniqueStepId = `${uniqueTestExecutionId}-${
      step.title
    }-${step.startTime.getTime()}`;

    console.log(`Stanterprise Reporter: Step ended - ${step.title}`);
    console.log(`  Duration: ${step.duration}ms`);

    // Map step error to status
    const stepStatus = mapStepStatus(!!step.error);

    // Build metadata from step annotations
    const metadata = new Map<string, string>();
    metadata.set("category", step.category);
    step.annotations.forEach((annotation, index) => {
      metadata.set(`annotation_${index}_type`, annotation.type);
      if (annotation.description) {
        metadata.set(`annotation_${index}_description`, annotation.description);
      }
    });

    // Get parent step ID if this step has a parent
    const parentStepId = step.parent
      ? `${uniqueTestExecutionId}-${
          step.parent.title
        }-${step.parent.startTime.getTime()}`
      : "";

    // Build and send the StepEnd event
    const request = new EventsNS.StepEndEventRequest({
      step: new TestCaseEntities.StepRun({
        id: uniqueStepId,
        run_id: this.runId,
        test_case_run_id: uniqueTestExecutionId,
        title: step.title,
        type: step.category,
        start_time: createTimestamp(step.startTime),
        duration: createDuration(step.duration),
        status: stepStatus,
        error: step.error ? step.error.message || "" : "",
        errors: step.error ? [step.error.message || ""] : [],
        location: step.location
          ? `${step.location.file}:${step.location.line}:${step.location.column}`
          : "",
        metadata: metadata,
        parent_step_id: parentStepId,
        worker_index: result.workerIndex.toString(),
      }),
    });

    // Fire-and-forget to avoid slowing tests
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportStepEnd",
      request,
      this.grpcTimeout
    ).catch((e) => this.logGrpcErrorOnce("Failed to report step end", e));
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const uniqueTestExecutionId = `${this.runId}-${test.id}`;

    console.log(`Stanterprise Reporter: Test ended - ${test.title}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Duration: ${result.duration}ms`);

    // Map Playwright test status to protobuf TestStatus
    const testStatus = mapTestStatus(result.status);

    // Process attachments (screenshots, videos, etc.)
    const attachments = processAttachments(result);

    // Extract error information if the test failed
    const { errorMessage, stackTrace, errors } = extractErrorInfo(result);

    // Get test suite run ID from parent suite if available, ensuring suite is reported
    const testSuiteRunId = test.parent ? this.getSuiteId(test.parent) : "";

    // Build metadata from test annotations and result metadata
    const metadata = new Map<string, string>();
    test.annotations.forEach((annotation, index) => {
      metadata.set(`annotation_${index}_type`, annotation.type);
      if (annotation.description) {
        metadata.set(`annotation_${index}_description`, annotation.description);
      }
    });
    result.annotations.forEach((annotation, index) => {
      metadata.set(`result_annotation_${index}_type`, annotation.type);
      if (annotation.description) {
        metadata.set(
          `result_annotation_${index}_description`,
          annotation.description
        );
      }
    });

    // Build and send the TestEnd event
    const request = new EventsNS.TestEndEventRequest({
      test_case: new TestCaseEntities.TestCaseRun({
        id: test.id,
        name: test.title,
        run_id: this.runId,
        test_suite_run_id: testSuiteRunId,
        status: testStatus,
        start_time: createTimestamp(result.startTime),
        attachments: attachments,
        error_message: errorMessage,
        stack_trace: stackTrace,
        errors: errors,
        metadata: metadata,
        tags: test.tags,
      }),
    });

    // Fire-and-forget to avoid slowing tests
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportTestEnd",
      request,
      this.grpcTimeout
    ).catch((e) => this.logGrpcErrorOnce("Failed to report test end", e));
  }

  onTestFail(test: TestCase, result: TestResult): void {
    const uniqueTestExecutionId = `${this.runId}-${test.id}`;

    if (this.verbose) {
      console.log(`Stanterprise Reporter: Test failed - ${test.title}`);
    }

    // Extract failure details
    const { errorMessage: failureMessage, stackTrace } =
      extractErrorInfo(result);

    // Process attachments for failed tests
    const attachments = processAttachments(result);

    // Build and send the TestFailure event
    const request = new EventsNS.TestFailureEventRequest({
      test_id: uniqueTestExecutionId,
      failure_message: failureMessage,
      stack_trace: stackTrace,
      timestamp: createTimestampFromMs(Date.now()),
      attachments: attachments,
    });

    // Fire-and-forget to avoid slowing tests
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportTestFailure",
      request,
      this.grpcTimeout
    ).catch((e) => this.logGrpcErrorOnce("Failed to report test failure", e));
  }

  onError(error: TestError): void {
    console.error(
      "Stanterprise Reporter: An error occurred during the test run"
    );
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
  }

  onStdErr(
    chunk: string | Buffer,
    test: void | TestCase,
    result: void | TestResult
  ): void {
    console.error(
      `Stanterprise Reporter: Standard error output - ${chunk.toString()}`
    );
  }

  onStdOut(
    chunk: string | Buffer,
    test: void | TestCase,
    result: void | TestResult
  ): void {
    // console.log(`Stanterprise Reporter: Standard output - ${chunk.toString()}`);
  }

  /**
   * Recursively report suite begin for a suite and all its children
   */
  private reportSuiteTreeBegin(suite: Suite): void {
    // Track suite start time
    const startTime = new Date();
    this.suiteTimes.set(suite, startTime);

    // Report this suite's begin
    const suiteId = this.getSuiteId(suite);
    this.reportSuiteBegin(suite, suiteId, startTime);

    // Log hierarchy with indentation in verbose mode
    if (this.verbose) {
      const depth = suite.titlePath().filter((t) => t).length - 1;
      const indent = "  ".repeat(Math.max(0, depth));
      console.log(`${indent}Suite begin: ${suite.title || "root"}`);
    }

    // Recursively report child suites
    if (suite.suites && suite.suites.length > 0) {
      for (const childSuite of suite.suites) {
        this.reportSuiteTreeBegin(childSuite);
      }
    }
  }

  /**
   * Recursively report suite end for a suite and all its children (in reverse order)
   */
  private reportSuiteTreeEnd(suite: Suite, result: FullResult): void {
    // First, recursively report child suites end (children before parent)
    if (suite.suites && suite.suites.length > 0) {
      for (const childSuite of suite.suites) {
        this.reportSuiteTreeEnd(childSuite, result);
      }
    }

    // Get suite start time
    const startTime = this.suiteTimes.get(suite) || this.runStartTime;

    // Log hierarchy with indentation in verbose mode
    if (this.verbose) {
      const depth = suite.titlePath().filter((t) => t).length - 1;
      const indent = "  ".repeat(Math.max(0, depth));
      console.log(`${indent}Suite end: ${suite.title || "root"}`);
    }

    // Then report this suite's end
    this.reportSuiteEnd(suite, result, startTime);
  }

  // Helper: Get suite ID for a suite, ensuring it's been reported
  private getSuiteId(suite: Suite): string {
    // Check if we've already generated an ID for this suite
    if (this.reportedSuites.has(suite)) {
      return this.reportedSuites.get(suite)!;
    }

    // Generate a unique suite ID based on full hierarchy path
    // titlePath() returns array like: ['', 'Parent Suite', 'Child Suite']
    const titlePath = suite.titlePath().filter((t) => t).join("/") || "root";

    // Sanitize path to be URL-safe
    const sanitizedPath = titlePath.replace(/[^a-zA-Z0-9-_\/]/g, "-");

    const suiteId = `${this.runId}-suite-${sanitizedPath}`;

    // Store the mapping
    this.reportedSuites.set(suite, suiteId);

    return suiteId;
  }

  // Helper: Report suite begin event
  private reportSuiteBegin(suite: Suite, suiteId: string, startTime: Date): void {
    console.log(
      `Stanterprise Reporter: Suite started - ${suite.title || "root"}`
    );
    console.log(`  Suite type: ${suite.type}`);

    // Build metadata from suite location
    const metadata = new Map<string, string>();
    metadata.set("suite_type", suite.type);
    if (suite.location) {
      metadata.set("location_file", suite.location.file);
      metadata.set("location_line", suite.location.line.toString());
      metadata.set("location_column", suite.location.column.toString());
    }

    // Build and send the SuiteBegin event
    const request = new EventsNS.SuiteBeginEventRequest({
      suite: new TestSuiteEntities.TestSuiteRun({
        id: suiteId,
        name: suite.title || "root",
        start_time: createTimestamp(startTime),
        metadata: metadata,
        // Add parent suite ID if not root
        parent_suite_id: suite.parent ? this.getSuiteId(suite.parent) : "",
      }),
    });

    // Fire-and-forget to avoid slowing tests
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportSuiteBegin",
      request,
      this.grpcTimeout
    ).catch((e) => this.logGrpcErrorOnce("Failed to report suite begin", e));
  }

  // Helper: Report suite end event
  private reportSuiteEnd(suite: Suite, result: FullResult, startTime: Date): void {
    const suiteId = this.getSuiteId(suite);
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log(
      `Stanterprise Reporter: Suite ended - ${suite.title || "root"}`
    );
    console.log(`  Duration: ${duration}ms`);

    // Map result status to protobuf TestStatus
    const suiteStatus = this.mapSuiteStatus(result.status);

    // Build metadata from suite location
    const metadata = new Map<string, string>();
    metadata.set("suite_type", suite.type);
    metadata.set("final_result", result.status);
    if (suite.location) {
      metadata.set("location_file", suite.location.file);
      metadata.set("location_line", suite.location.line.toString());
      metadata.set("location_column", suite.location.column.toString());
    }

    // Build and send the SuiteEnd event
    const request = new EventsNS.SuiteEndEventRequest({
      suite: new TestSuiteEntities.TestSuiteRun({
        id: suiteId,
        name: suite.title || "root",
        start_time: createTimestamp(startTime),
        end_time: createTimestamp(endTime),
        duration: createDuration(duration),
        status: suiteStatus,
        metadata: metadata,
        // Add parent suite ID if not root
        parent_suite_id: suite.parent ? this.getSuiteId(suite.parent) : "",
      }),
    });

    // Fire-and-forget to avoid slowing tests
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportSuiteEnd",
      request,
      this.grpcTimeout
    ).catch((e) => this.logGrpcErrorOnce("Failed to report suite end", e));
  }

  // Helper: Map FullResult status to protobuf TestStatus
  private mapSuiteStatus(status: FullResult["status"]): number {
    switch (status) {
      case "passed":
        return TestStatus.PASSED;
      case "failed":
        return TestStatus.FAILED;
      case "timedout":
        return TestStatus.FAILED;
      case "interrupted":
        return TestStatus.BROKEN;
      default:
        return TestStatus.UNKNOWN;
    }
  }

  // Helper: log first gRPC error once and disable further attempts
  private logGrpcErrorOnce(prefix: string, err: unknown) {
    if (this.grpcFirstErrorLogged) return;
    this.grpcFirstErrorLogged = true;
    const details = err instanceof Error ? `${err.message}` : String(err);
    console.warn(
      `${prefix}. gRPC disabled for the remainder of the run. Address=${this.grpcAddress}. Details: ${details}`
    );
    this.grpcEnabled = false;
  }

  // Helper: generic unary call using raw method path
  private async reportUnary(
    path: string,
    message: {
      serialize?: (w?: any) => Uint8Array;
      serializeBinary?: () => Uint8Array;
    },
    deadlineMs: number = 1000
  ): Promise<Buffer> {
    if (!this.grpcEnabled || !this.grpcClient) {
      return Buffer.alloc(0);
    }

    const reqSerialize = (arg: unknown): Buffer => {
      const m = arg as
        | {
            serializeBinary?: () => Uint8Array;
            serialize?: (w?: any) => Uint8Array;
          }
        | undefined;
      const bytes = m?.serializeBinary
        ? m.serializeBinary()
        : m?.serialize
        ? m.serialize()
        : new Uint8Array(0);
      return Buffer.from(bytes);
    };

    const resDeserialize = (bytes: Buffer): Buffer => bytes;

    const metadata = new grpc.Metadata();
    const callOptions: grpc.CallOptions = {
      deadline: new Date(Date.now() + deadlineMs),
    };

    return new Promise<Buffer>((resolve, reject) => {
      try {
        (
          this.grpcClient as unknown as {
            makeUnaryRequest: (
              path: string,
              serialize: (arg: unknown) => Buffer,
              deserialize: (arg: Buffer) => Buffer,
              arg: unknown,
              metadata: grpc.Metadata,
              options: grpc.CallOptions,
              callback: (err: grpc.ServiceError | null, res: Buffer) => void
            ) => void;
          }
        ).makeUnaryRequest(
          path,
          reqSerialize,
          resDeserialize,
          message,
          metadata,
          callOptions,
          (err, response) => {
            if (err) return reject(err);
            resolve(response);
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }
}
