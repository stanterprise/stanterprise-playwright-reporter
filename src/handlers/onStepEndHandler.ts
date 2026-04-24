import { TestCase, TestResult, TestStep } from "@playwright/test/reporter";
import { StepRun } from "@stanterprise/protobuf/testsystem/v1/entities";
import { StepEndEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import {
  createDuration,
  createTimestamp,
  mapStepStatus,
  buildStepMetadata,
  toMetadataMap,
  truncateValue,
  processAttachments,
} from "../utils";
import { StanterpriseReporterOptions } from "../types";
import * as grpc from "@grpc/grpc-js";
import { reportUnary } from "../client/grpcClient";
import { generateStepId } from "../utils";
import { MessageQueue } from "../client/messageQueue";

export function handleOnStepEndEvent(
  test: TestCase,
  result: TestResult,
  step: TestStep,
  runId: string,
  executionId: string,
  client: grpc.Client,
  options: StanterpriseReporterOptions,
  queue?: MessageQueue,
) {
  // Map step error to status
  const stepStatus = mapStepStatus(!!step.error);

  const attachments = processAttachments(
    result,
    options.maxAttachmentSize || 10485760,
  );

  // Build metadata from step annotations
  const metadata = buildStepMetadata(step);

  const stepId = generateStepId(step, test);

  // Extract comprehensive error details if present
  const errorMessage = step.error?.message || "";
  const errorStack = step.error?.stack || "";
  const errorValue = step.error?.value || "";
  const errorSnippet = step.error?.snippet || "";
  const errorLocation = step.error?.location
    ? `${step.error.location.file}:${step.error.location.line}:${step.error.location.column}`
    : "";

  // Combine all error information into metadata for comprehensive error tracking
  const errorMetadata: Record<string, string> = {};
  if (errorStack) errorMetadata.error_stack = truncateValue(errorStack);
  if (errorValue) errorMetadata.error_value = truncateValue(errorValue);
  if (errorSnippet) errorMetadata.error_snippet = truncateValue(errorSnippet);
  if (errorLocation)
    errorMetadata.error_location = truncateValue(errorLocation);

  // Build and send the StepEnd event
  const request = new StepEndEventRequest({
    step: new StepRun({
      id: stepId,
      run_id: runId,
      test_case_id: test.id,
      title: step.title,
      type: step.category,
      start_time: createTimestamp(step.startTime),
      duration: createDuration(step.duration),
      status: stepStatus,
      error: errorMessage,
      errors: errorMessage ? [errorMessage] : [],
      location: step.location
        ? `${step.location.file}:${step.location.line}:${step.location.column}`
        : "",
      metadata: toMetadataMap({ ...metadata, ...errorMetadata }),
      parent_step_id: step.parent
        ? generateStepId(step.parent, test)
        : undefined,
      worker_index: result.workerIndex.toString(),
      retry_index: result.retry,
      attachments: attachments,
      execution_id: executionId,
    }),
  });

  // Fire-and-forget to avoid slowing tests
  reportUnary(
    options,
    client,
    "/testsystem.v1.observer.TestEventCollector/ReportStepEnd",
    request,
    options.grpcTimeout,
    queue,
  ).catch((e) => console.error("Failed to report step end", e));
}
