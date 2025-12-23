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
import * as grpc from "@grpc/grpc-js";
import { randomUUID } from "crypto";
import { StanterpriseReporterOptions } from "./types";
import defineOptions from "./utils/optionsMapper";
import getClient from "./client/grpcClient";
import {
  handleOnBeginEvent,
  handleOnErrorEvent,
  handleOnStepBeginEvent,
  handleOnStepEndEvent,
  handleOnTestBeginEvent,
  handleOnTestEndEvent,
  handleOnTestFailEvent,
} from "./handlers";

export default class StanterpriseReporter implements Reporter {
  // Generic gRPC client (we call unary methods by path directly).
  private grpcClient: grpc.Client | null = null;
  private options: StanterpriseReporterOptions = {};

  // Generate a unique run ID for this test run
  private runId: string = "";
  private runStartTime: Date = new Date();

  constructor(options: StanterpriseReporterOptions = {}) {
    this.options = defineOptions(options);

    if (this.options.verbose) {
      console.log("Stanterprise Reporter: Initialized with options:", {
        grpcAddress: this.options.grpcAddress,
        grpcEnabled: this.options.grpcEnabled,
        grpcTimeout: this.options.grpcTimeout,
        verbose: this.options.verbose,
      });
    }

    // Generate a UUID for runId
    this.runId = process.env.STANTERPRISE_RUN_ID || randomUUID();
  }

  onBegin(config: FullConfig, suite: Suite): void {
    // Lazily create the client if enabled.
    if (this.options.grpcEnabled) {
      this.grpcClient = getClient(this.options);
      if (!this.grpcClient) {
        console.warn(
          `Stanterprise Reporter: Failed to create gRPC client. Disabling gRPC reporting.`
        );
        this.options.grpcEnabled = false;
      }
    } else {
      if (this.options.verbose) {
        console.log(
          "Stanterprise Reporter: gRPC disabled via STANTERPRISE_GRPC_ENABLED=false"
        );
      }
    }
    if (this.options.verbose) {
      console.log(
        `Stanterprise Reporter: Test run started with ID: ${this.runId}`
      );
      console.log(`Number of tests: ${suite.allTests().length}`);
      console.log(`Run started at: ${this.runStartTime.toISOString()}`);
    }
    if (this.options.grpcEnabled) {
      handleOnBeginEvent(
        config,
        suite,
        this.runId,
        this.grpcClient!,
        this.options
      );
    }
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

  onEnd(
    result: FullResult
  ): Promise<{ status?: FullResult["status"] } | undefined | void> | void {
    const runDuration = Date.now() - this.runStartTime.getTime();
    if (this.options.verbose) {
      console.log(
        `Stanterprise Reporter: Test run ended - Run ID: ${this.runId}`
      );
      console.log(`Final result: ${result.status}`);
      console.log(
        `Run duration: ${runDuration}ms (Playwright duration: ${result.duration}ms)`
      );
      console.log(`Run start time: ${this.runStartTime.toISOString()}`);
      console.log(`Playwright start time: ${result.startTime.toISOString()}`);
    }

    return Promise.resolve();
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    // Create unique test execution ID combining run ID and test ID

    if (this.options.verbose) {
      console.log(`Stanterprise Reporter: Test started - ${test.title}`);
      console.log(`  Run ID: ${this.runId}`);
      console.log(`  Test ID: ${test.id}`);
    }
    if (this.options.grpcEnabled) {
      handleOnTestBeginEvent(
        test,
        result,
        this.runId,
        this.grpcClient!,
        this.options
      );
    }
  }

  async onStepBegin(
    test: TestCase,
    result: TestResult,
    step: TestStep
  ): Promise<void> {
    if (this.options.verbose) {
      console.log(`Stanterprise Reporter: Step started - ${step.title}`);
      console.log(`  Category: ${step.category}`);
    }
    if (this.options.grpcEnabled) {
      handleOnStepBeginEvent(
        test,
        result,
        step,
        this.runId,
        this.grpcClient!,
        this.options
      );
    }
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
    if (this.options.verbose) {
      console.log(`Stanterprise Reporter: Step ended - ${step.title}`);
      console.log(`  Duration: ${step.duration}ms`);
    }
    if (this.options.grpcEnabled) {
      handleOnStepEndEvent(
        test,
        result,
        step,
        this.runId,
        this.grpcClient!,
        this.options
      );
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (this.options.verbose) {
      console.log(`Stanterprise Reporter: Test ended - ${test.title}`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Duration: ${result.duration}ms`);
    }
    if (this.options.grpcEnabled) {
      handleOnTestEndEvent(
        test,
        result,
        this.runId,
        this.grpcClient!,
        this.options
      );
    }
  }

  onTestFail(test: TestCase, result: TestResult): void {
    if (this.options.verbose) {
      console.log(`Stanterprise Reporter: Test failed - ${test.title}`);
    }
    if (this.options.grpcEnabled) {
      handleOnTestFailEvent(
        test,
        result,
        this.runId,
        this.grpcClient!,
        this.options
      );
    }
  }

  onError(error: TestError): void {
    console.error(
      "Stanterprise Reporter: An error occurred during the test run"
    );
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
    if (this.options.grpcEnabled) {
      handleOnErrorEvent(error, this.runId, this.grpcClient!, this.options);
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
}
