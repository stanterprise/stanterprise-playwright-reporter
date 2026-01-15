import { TestCase, TestResult } from "@playwright/test/reporter";
import { TestCaseRun } from "@stanterprise/protobuf/testsystem/v1/entities";
import { TestEndEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import {
  mapTestStatus,
  processAttachments,
  extractErrorInfo,
  createTimestamp,
  createDuration,
  buildTestMetadata,
  toMetadataMap,
} from "../utils";
import { reportUnary } from "../client/grpcClient";
import { StanterpriseReporterOptions } from "../types";
import * as grpc from "@grpc/grpc-js";
import { generateSuiteId } from "../utils";

export function handleOnTestEndEvent(
  test: TestCase,
  result: TestResult,
  runId: string,
  client: grpc.Client,
  options: StanterpriseReporterOptions
) {
  // Map Playwright test status to protobuf TestStatus
  const testStatus = mapTestStatus(result.status);

  // Process attachments (screenshots, videos, etc.)
  const attachments = processAttachments(
    result,
    options.maxAttachmentSize || 10485760
  );

  // Extract error information if the test failed
  const { errorMessage, stackTrace, errors } = extractErrorInfo(result);

  // Get test suite run ID from parent suite if available, ensuring suite is reported
  const suiteId = generateSuiteId(test.parent);

  // Build metadata from test annotations and result metadata
  const metadata = buildTestMetadata(test, result);

  // Build and send the TestEnd event
  const request = new TestEndEventRequest({
    test_case: new TestCaseRun({
      id: test.id,
      name: test.title,
      run_id: runId,
      test_suite_id: suiteId,
      status: testStatus,
      start_time: createTimestamp(result.startTime),
      duration: createDuration(result.duration),
      attachments: attachments,
      error_message: errorMessage,
      stack_trace: stackTrace,
      errors: errors,
      metadata: toMetadataMap(metadata),
      tags: test.tags,
    }),
  });

  // Fire-and-forget to avoid slowing tests
  reportUnary(
    options,
    client,
    "/testsystem.v1.observer.TestEventCollector/ReportTestEnd",
    request,
    options.grpcTimeout
  ).catch((e) => {
    const serializedSize = request.serializeBinary
      ? request.serializeBinary().length
      : 0;
    console.error(
      `Failed to report test end for "${test.title}" (payload size: ${(
        serializedSize / 1048576
      ).toFixed(2)}MB)`,
      e
    );
  });
}
