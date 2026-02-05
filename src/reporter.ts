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
import { mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import { StanterpriseReporterOptions } from "./types";
import defineOptions from "./utils/optionsMapper";
import { createReporterLogger, ReporterLogger } from "./utils/logger";
import getClient from "./client/grpcClient";
import {
  handleOnBeginEvent,
  handleOnEndEvent,
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
  private logger: ReporterLogger;

  // Generate a unique run ID for this test run
  private runId: string = "";
  private runStartTime: Date = new Date();

  constructor(options: StanterpriseReporterOptions = {}) {
    this.options = defineOptions(options);
    this.logger = createReporterLogger(this.options);

    this.logger.verbose("Stanterprise Reporter: Initialized with options:", {
      grpcAddress: this.options.grpcAddress,
      grpcEnabled: this.options.grpcEnabled,
      grpcTimeout: this.options.grpcTimeout,
      verbose: this.options.verbose,
    });

    // Generate a UUID for runId
    this.runId = process.env.STANTERPRISE_RUN_ID || randomUUID();
  }

  async onBegin(config: FullConfig, suite: Suite): Promise<void> {
    const outputDirs = new Set<string>();
    for (const project of config.projects ?? []) {
      if (project.outputDir) {
        outputDirs.add(project.outputDir);
      }
    }

    for (const outputDir of outputDirs) {
      try {
        await mkdir(outputDir, { recursive: true });
      } catch (error) {
        console.error(
          `Stanterprise Reporter: Failed to create output directory: ${outputDir}`,
          error,
        );
      }
    }
    // Lazily create the client if enabled.
    if (this.options.grpcEnabled) {
      this.grpcClient = getClient(this.options);
      if (!this.grpcClient) {
        console.warn(
          `Stanterprise Reporter: Failed to create gRPC client. Disabling gRPC reporting.`,
        );
        this.options.grpcEnabled = false;
      }
    } else {
      this.logger.verbose(
        "Stanterprise Reporter: gRPC disabled via STANTERPRISE_GRPC_ENABLED=false",
      );
    }
    this.logger.verbose(
      `Stanterprise Reporter: Test run started with ID: ${this.runId}`,
    );
    this.logger.verbose(`Number of tests: ${suite.allTests().length}`);
    this.logger.verbose(`Run started at: ${this.runStartTime.toISOString()}`);
    if (config.shard) {
      this.logger.verbose(
        `Shard: ${config.shard.current} of ${config.shard.total}`,
      );
    }
    if (this.options.grpcEnabled) {
      handleOnBeginEvent(
        config,
        suite,
        process.env.STANTERPRISE_TEST_RUN_NAME || "Playwright Test Run",
        this.runId,
        this.grpcClient!,
        this.options,
      );
    }
  }

  async onExit(): Promise<void> {
    this.logger.verbose(
      `Stanterprise Reporter: Test run completed - Run ID: ${this.runId}`,
    );
    // Cleanup gRPC client
    try {
      this.grpcClient?.close();
    } catch (e) {
      console.error(
        "Stanterprise Reporter: Error during gRPC client cleanup in onExit:",
        e,
      );
    }
  }

  onEnd(
    result: FullResult,
  ): Promise<{ status?: FullResult["status"] } | undefined | void> | void {
    const runDuration = Date.now() - this.runStartTime.getTime();
    this.logger.verbose(
      `Stanterprise Reporter: Test run ended - Run ID: ${this.runId}`,
    );
    this.logger.verbose(`Final result: ${result.status}`);
    this.logger.verbose(
      `Run duration: ${runDuration}ms (Playwright duration: ${result.duration}ms)`,
    );
    this.logger.verbose(`Run start time: ${this.runStartTime.toISOString()}`);
    this.logger.verbose(
      `Playwright start time: ${result.startTime.toISOString()}`,
    );

    if (this.options.grpcEnabled) {
      handleOnEndEvent(result, this.runId, this.grpcClient!, this.options);
    }

    return Promise.resolve();
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    // Create unique test execution ID combining run ID and test ID

    this.logger.verbose(`Stanterprise Reporter: Test started - ${test.title}`);
    this.logger.verbose(`  Run ID: ${this.runId}`);
    this.logger.verbose(`  Test ID: ${test.id}`);
    if (this.options.grpcEnabled) {
      handleOnTestBeginEvent(
        test,
        result,
        this.runId,
        this.grpcClient!,
        this.options,
      );
    }
  }

  async onStepBegin(
    test: TestCase,
    result: TestResult,
    step: TestStep,
  ): Promise<void> {
    this.logger.verbose(`Stanterprise Reporter: Step started - ${step.title}`);
    this.logger.verbose(`  Category: ${step.category}`);
    if (this.options.grpcEnabled) {
      handleOnStepBeginEvent(
        test,
        result,
        step,
        this.runId,
        this.grpcClient!,
        this.options,
      );
    }
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
    this.logger.verbose(`Stanterprise Reporter: Step ended - ${step.title}`);
    this.logger.verbose(`  Duration: ${step.duration}ms`);
    if (this.options.grpcEnabled) {
      handleOnStepEndEvent(
        test,
        result,
        step,
        this.runId,
        this.grpcClient!,
        this.options,
      );
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.logger.verbose(`Stanterprise Reporter: Test ended - ${test.title}`);
    this.logger.verbose(`  Status: ${result.status}`);
    this.logger.verbose(`  Duration: ${result.duration}ms`);
    if (this.options.grpcEnabled) {
      handleOnTestEndEvent(
        test,
        result,
        this.runId,
        this.grpcClient!,
        this.options,
      );
    }
  }

  onTestFail(test: TestCase, result: TestResult): void {
    this.logger.verbose(`Stanterprise Reporter: Test failed - ${test.title}`);
    if (this.options.grpcEnabled) {
      handleOnTestFailEvent(
        test,
        result,
        this.runId,
        this.grpcClient!,
        this.options,
      );
    }
  }

  onError(error: TestError): void {
    console.error(
      "Stanterprise Reporter: An error occurred during the test run",
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
    result: void | TestResult,
  ): void {
    console.error(
      `Stanterprise Reporter: Standard error output - ${chunk.toString()}`,
    );
  }

  onStdOut(
    chunk: string | Buffer,
    test: void | TestCase,
    result: void | TestResult,
  ): void {
    this.logger.verbose(
      `Stanterprise Reporter: Standard output - ${chunk.toString()}`,
    );
  }
}
