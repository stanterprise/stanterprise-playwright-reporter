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

/**
 * Constant for converting bytes to megabytes
 */
const BYTES_PER_MB = 1048576;

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

  // Serialize once to capture payload size for potential error logging
  const serializedPayload = request.serializeBinary();
  const payloadSize = serializedPayload.length;

  // Warn if payload is unusually large (>1MB)
  if (payloadSize > 1048576) {
    console.warn(
      `Large payload detected for test "${test.title}": ${(
        payloadSize / BYTES_PER_MB
      ).toFixed(2)}MB. ` +
        `Attachments: ${attachments.length}, Metadata keys: ${
          Object.keys(metadata).length
        }, ` +
        `Error length: ${errorMessage.length + stackTrace.length} bytes`
    );
  }

  // Fire-and-forget to avoid slowing tests
  reportUnary(
    options,
    client,
    "/testsystem.v1.observer.TestEventCollector/ReportTestEnd",
    request,
    options.grpcTimeout
  ).catch((e) => {
    console.error(
      `Failed to report test end for "${test.title}" (payload size: ${(
        payloadSize / BYTES_PER_MB
      ).toFixed(2)}MB)`,
      e
    );
  });
}
