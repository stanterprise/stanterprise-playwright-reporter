import { TestCase, TestResult, TestStep } from "@playwright/test/reporter";
import { StepRun } from "@stanterprise/protobuf/testsystem/v1/entities";
import { StepBeginEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import { StanterpriseReporterOptions } from "../types";
import { createTimestamp } from "../utils";
import * as grpc from "@grpc/grpc-js";
import { reportUnary } from "../client/grpcClient";
import { generateStepId } from "../utils";
import { TestStatus } from "@stanterprise/protobuf/testsystem/v1/common";

export function handleOnStepBeginEvent(
  test: TestCase,
  result: TestResult,
  step: TestStep,
  runId: string,
  client: grpc.Client,
  options: StanterpriseReporterOptions
) {
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
      metadata: metadata,
      parent_step_id: step.parent
        ? generateStepId(step.parent, test)
        : undefined,
      worker_index: result.workerIndex.toString(),
    }),
  });

  // Fire-and-forget to avoid slowing tests
  reportUnary(
    options,
    client,
    "/testsystem.v1.observer.TestEventCollector/ReportStepBegin",
    request,
    options.grpcTimeout
  ).catch((e) => console.error("Failed to report step begin", e));
}
