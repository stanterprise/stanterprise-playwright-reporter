import { TestCaseRun } from "@stanterprise/protobuf/testsystem/v1/entities";
import { TestBeginEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import { createTimestamp, generateSuiteId } from "../utils";
import { TestCase, TestResult } from "@playwright/test/reporter";
import { StanterpriseReporterOptions } from "../types";
import * as grpc from "@grpc/grpc-js";
import { reportUnary } from "../client/grpcClient";

export function handleOnTestBeginEvent(
  test: TestCase,
  result: TestResult,
  runId: string,
  client: grpc.Client,
  options: StanterpriseReporterOptions
) {
  // Build and send the TestBegin event via generic unary call.
  const request = new TestBeginEventRequest({
    test_case: new TestCaseRun({
      id: test.id,
      name: test.title,
      run_id: runId,
      test_suite_run_id: generateSuiteId(test.parent),
      start_time: createTimestamp(result.startTime),
      tags: test.tags,
    }),
  });

  // Fire-and-forget to avoid slowing tests; log errors once.
  reportUnary(
    options,
    client,
    "/testsystem.v1.observer.TestEventCollector/ReportTestBegin",
    request,
    options.grpcTimeout
  ).catch((e) => {
    const details = e instanceof Error ? `${e.message}` : String(e);
    console.warn(`Failed to report test begin. Details: ${details}`);
  });
}
