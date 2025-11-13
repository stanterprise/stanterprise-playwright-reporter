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
import {
  google,
  testsystem,
  events,
  common,
  entities,
} from "@stanterprise/protobuf";
import { google as googleProtobuf } from "@stanterprise/protobuf/dist/lib/google/protobuf/duration";
import * as grpc from "@grpc/grpc-js";
import { randomUUID } from "crypto";

export default class StanterpriseReporter implements Reporter {
  // Generic gRPC client (we call unary methods by path directly).
  private grpcClient: grpc.Client | null = null;
  private grpcAddress: string =
    process.env.STANTERPRISE_GRPC_ADDRESS || "localhost:50051";
  private grpcEnabled: boolean =
    (process.env.STANTERPRISE_GRPC_ENABLED || "true").toLowerCase() !== "false";
  private grpcFirstErrorLogged = false;

  // Generate a unique run ID for this test run
  private runId: string = "";
  private runStartTime: Date = new Date();

  onBegin(config: FullConfig, suite: Suite): void {
    // Generate a UUID for runId
    this.runId = randomUUID();

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
      console.log(
        "Stanterprise Reporter: gRPC disabled via STANTERPRISE_GRPC_ENABLED=false"
      );
    }

    console.log(
      `Stanterprise Reporter: Test run started with ID: ${this.runId}`
    );
    console.log(`Number of tests: ${suite.allTests().length}`);
    console.log(`Run started at: ${this.runStartTime.toISOString()}`);
    // console.log(`Configuration: ${JSON.stringify(config, null, 2)}`);
  }

  async onExit(): Promise<void> {
    console.log(
      `Stanterprise Reporter: Test run completed - Run ID: ${this.runId}`
    );
    // Cleanup gRPC client
    try {
      this.grpcClient?.close();
    } catch (e) {
      console.error("Stanterprise Reporter: Error during gRPC client cleanup in onExit:", e);
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

    return Promise.resolve();
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    // Create unique test execution ID combining run ID and test ID
    const uniqueTestExecutionId = `${this.runId}-${test.id}`;

    console.log(`Stanterprise Reporter: Test started - ${test.title}`);
    console.log(`  Run ID: ${this.runId}`);
    console.log(`  Test ID (static): ${test.id}`);
    console.log(`  Unique Execution ID: ${uniqueTestExecutionId}`);

    // Build and send the TestBegin event via generic unary call.
    const request = new events.TestBeginEventRequest({
      test_case: new entities.TestCaseRun({
        id: uniqueTestExecutionId,
        title: test.title,
        run_id: this.runId,
      }),
    });

    // Fire-and-forget to avoid slowing tests; log errors once.
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportTestBegin",
      request,
      1000
    ).catch((e) => this.logGrpcErrorOnce("Failed to report test begin", e));
  }

  async onStepBegin(
    test: TestCase,
    result: TestResult,
    step: TestStep
  ): Promise<void> {
    const uniqueTestExecutionId = `${this.runId}-${test.id}`;
    const uniqueStepId = `${uniqueTestExecutionId}-${step.title}-${step.startTime.getTime()}`;

    console.log(`Stanterprise Reporter: Step started - ${step.title}`);
    console.log(`  Category: ${step.category}`);

    // Build and send the StepBegin event
    const request = new events.StepBeginEventRequest({
      step: new entities.StepRun({
        id: uniqueStepId,
        run_id: this.runId,
        test_case_run_id: uniqueTestExecutionId,
        title: step.title,
        type: step.category,
        start_time: new google.protobuf.Timestamp({
          seconds: Math.floor(step.startTime.getTime() / 1000),
          nanos: (step.startTime.getTime() % 1000) * 1000000,
        }),
        location: step.location
          ? `${step.location.file}:${step.location.line}:${step.location.column}`
          : "",
      }),
    });

    // Fire-and-forget to avoid slowing tests
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportStepBegin",
      request,
      1000
    ).catch((e) => this.logGrpcErrorOnce("Failed to report step begin", e));
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
    const uniqueTestExecutionId = `${this.runId}-${test.id}`;
    const uniqueStepId = `${uniqueTestExecutionId}-${step.title}-${step.startTime.getTime()}`;

    console.log(`Stanterprise Reporter: Step ended - ${step.title}`);
    console.log(`  Duration: ${step.duration}ms`);

    // Map step error to status
    const stepStatus = step.error
      ? common.TestStatus.FAILED
      : common.TestStatus.PASSED;

    // Build and send the StepEnd event
    const request = new events.StepEndEventRequest({
      step: new entities.StepRun({
        id: uniqueStepId,
        run_id: this.runId,
        test_case_run_id: uniqueTestExecutionId,
        title: step.title,
        type: step.category,
        start_time: new google.protobuf.Timestamp({
          seconds: Math.floor(step.startTime.getTime() / 1000),
          nanos: (step.startTime.getTime() % 1000) * 1000000,
        }),
        duration: new googleProtobuf.protobuf.Duration({
          seconds: Math.floor(step.duration / 1000),
          nanos: (step.duration % 1000) * 1000000,
        }),
        status: stepStatus,
        error: step.error ? step.error.message || "" : "",
        errors: step.error ? [step.error.message || ""] : [],
        location: step.location
          ? `${step.location.file}:${step.location.line}:${step.location.column}`
          : "",
      }),
    });

    // Fire-and-forget to avoid slowing tests
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportStepEnd",
      request,
      1000
    ).catch((e) => this.logGrpcErrorOnce("Failed to report step end", e));
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const uniqueTestExecutionId = `${this.runId}-${test.id}`;

    console.log(`Stanterprise Reporter: Test ended - ${test.title}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Duration: ${result.duration}ms`);

    // Map Playwright test status to protobuf TestStatus
    let testStatus = common.TestStatus.UNKNOWN;
    switch (result.status) {
      case "passed":
        testStatus = common.TestStatus.PASSED;
        break;
      case "failed":
        testStatus = common.TestStatus.FAILED;
        break;
      case "skipped":
        testStatus = common.TestStatus.SKIPPED;
        break;
      case "timedOut":
        testStatus = common.TestStatus.FAILED; // Treat timeout as failed
        break;
    }

    // Process attachments (screenshots, videos, etc.)
    const attachments: InstanceType<typeof common.Attachment>[] = [];
    if (result.attachments && result.attachments.length > 0) {
      for (const attachment of result.attachments) {
        const att = new common.Attachment({
          name: attachment.name,
          mime_type: attachment.contentType,
        });

        // Use path as URI if available, otherwise we'd need to read the body
        if (attachment.path) {
          att.uri = attachment.path;
        } else if (attachment.body) {
          att.content = attachment.body;
        }

        attachments.push(att);
      }
    }

    // Extract error information if the test failed
    let errorMessage = "";
    let stackTrace = "";
    const errors: string[] = [];

    if (result.errors && result.errors.length > 0) {
      errorMessage = result.errors.map((e) => e.message || "").join("\n");
      stackTrace = result.errors.map((e) => e.stack || "").join("\n");
      errors.push(...result.errors.map((e) => e.message || ""));
    }

    // Build and send the TestEnd event
    const request = new events.TestEndEventRequest({
      test_case: new entities.TestCaseRun({
        id: uniqueTestExecutionId,
        title: test.title,
        run_id: this.runId,
        test_id: test.id,
        status: testStatus,
        attachments: attachments,
        error_message: errorMessage,
        stack_trace: stackTrace,
        errors: errors,
      }),
    });

    // Fire-and-forget to avoid slowing tests
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportTestEnd",
      request,
      1000
    ).catch((e) => this.logGrpcErrorOnce("Failed to report test end", e));
  }

  onTestFail(test: TestCase, result: TestResult): void {
    const uniqueTestExecutionId = `${this.runId}-${test.id}`;

    console.log(`Stanterprise Reporter: Test failed - ${test.title}`);

    // Extract failure details
    let failureMessage = "";
    let stackTrace = "";
    const attachments: InstanceType<typeof common.Attachment>[] = [];

    if (result.errors && result.errors.length > 0) {
      failureMessage = result.errors.map((e) => e.message || "").join("\n");
      stackTrace = result.errors.map((e) => e.stack || "").join("\n");
    }

    // Process attachments for failed tests
    if (result.attachments && result.attachments.length > 0) {
      for (const attachment of result.attachments) {
        const att = new common.Attachment({
          name: attachment.name,
          mime_type: attachment.contentType,
        });

        if (attachment.path) {
          att.uri = attachment.path;
        } else if (attachment.body) {
          att.content = attachment.body;
        }

        attachments.push(att);
      }
    }

    // Build and send the TestFailure event
    const request = new events.TestFailureEventRequest({
      test_id: uniqueTestExecutionId,
      failure_message: failureMessage,
      stack_trace: stackTrace,
      timestamp: new google.protobuf.Timestamp({
        seconds: Math.floor(Date.now() / 1000),
        nanos: (Date.now() % 1000) * 1000000,
      }),
      attachments: attachments,
    });

    // Fire-and-forget to avoid slowing tests
    this.reportUnary(
      "/testsystem.v1.observer.TestEventCollector/ReportTestFailure",
      request,
      1000
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
