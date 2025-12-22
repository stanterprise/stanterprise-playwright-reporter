import { TestCase, TestResult } from "@playwright/test/reporter";
import { StanterpriseReporterOptions } from "../types";
import {
  createTimestampFromMs,
  extractErrorInfo,
  processAttachments,
} from "../utils";
import * as grpc from "@grpc/grpc-js";
import { TestFailureEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import { reportUnary } from "../client/grpcClient";

export function handleOnTestFailEvent(
  test: TestCase,
  result: TestResult,
  runId: string,
  grpcClient: grpc.Client,
  options: StanterpriseReporterOptions
) {
  // Extract failure details
  const { errorMessage: failureMessage, stackTrace } = extractErrorInfo(result);

  // Process attachments for failed tests
  const attachments = processAttachments(result);

  // Build and send the TestFailure event
  const request = new TestFailureEventRequest({
    test_id: test.id,
    run_id: runId,
    failure_message: failureMessage,
    stack_trace: stackTrace,
    timestamp: createTimestampFromMs(Date.now()),
    attachments: attachments,
  });

  // Fire-and-forget to avoid slowing tests
  reportUnary(
    options,
    grpcClient,
    "/testsystem.v1.observer.TestEventCollector/ReportTestFailure",
    request,
    options.grpcTimeout
  ).catch((e) => console.error("Failed to report test failure", e));
}
