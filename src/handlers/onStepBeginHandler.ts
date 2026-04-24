import { TestCase, TestResult, TestStep } from "@playwright/test/reporter";
import { StepRun } from "@stanterprise/protobuf/testsystem/v1/entities";
import { StepBeginEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import { StanterpriseReporterOptions } from "../types";
import { createTimestamp, buildStepMetadata, toMetadataMap } from "../utils";
import * as grpc from "@grpc/grpc-js";
import { reportUnary } from "../client/grpcClient";
import { generateStepId } from "../utils";
import { MessageQueue } from "../client/messageQueue";
import { TestStatus } from "@stanterprise/protobuf/testsystem/v1/common";

export function handleOnStepBeginEvent(
  test: TestCase,
  result: TestResult,
  step: TestStep,
  runId: string,
  executionId: string,
  client: grpc.Client,
  options: StanterpriseReporterOptions,
  queue?: MessageQueue,
) {
  // Build metadata from step annotations
  const metadata = buildStepMetadata(step);

  // Get parent step ID if this step has a parent
  const stepId = generateStepId(step, test);

  // Build and send the StepBegin event
  const request = new StepBeginEventRequest({
    step: new StepRun({
      id: stepId,
      run_id: runId,
      test_case_id: test.id,
      title: step.title,
      status: TestStatus.RUNNING,
      type: step.category,
      start_time: createTimestamp(step.startTime),
      location: step.location
        ? `${step.location.file}:${step.location.line}:${step.location.column}`
        : undefined,
      metadata: toMetadataMap(metadata),
      parent_step_id: step.parent
        ? generateStepId(step.parent, test)
        : undefined,
      worker_index: result.workerIndex.toString(),
      retry_index: result.retry,
      execution_id: executionId,
    }),
  });

  // Fire-and-forget to avoid slowing tests
  reportUnary(
    options,
    client,
    "/testsystem.v1.observer.TestEventCollector/ReportStepBegin",
    request,
    options.grpcTimeout,
    queue,
  ).catch((e) => console.error("Failed to report step begin", e));
}
