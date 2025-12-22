import { TestCase, TestResult, TestStep } from "@playwright/test/reporter";
import { StepRun } from "@stanterprise/protobuf/testsystem/v1/entities";
import { StepEndEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import { createDuration, createTimestamp, mapStepStatus } from "../utils";
import { StanterpriseReporterOptions } from "../types";
import * as grpc from "@grpc/grpc-js";
import { reportUnary } from "../client/grpcClient";
import { generateStepId } from "../utils";

export function handleOnStepEndEvent(
  test: TestCase,
  result: TestResult,
  step: TestStep,
  runId: string,
  client: grpc.Client,
  options: StanterpriseReporterOptions
) {
  // Map step error to status
  const stepStatus = mapStepStatus(!!step.error);

  // Build metadata from step annotations
  const metadata = new Map<string, string>();
  metadata.set("category", step.category);
  step.annotations.forEach((annotation, index) => {
    metadata.set(`annotation_${index}_type`, annotation.type);
    if (annotation.description) {
      metadata.set(`annotation_${index}_description`, annotation.description);
    }
  });

  const stepId = generateStepId(step, test);

  // Build and send the StepEnd event
  const request = new StepEndEventRequest({
    step: new StepRun({
      id: stepId,
      run_id: runId,
      test_case_run_id: test.id,
      title: step.title,
      type: step.category,
      start_time: createTimestamp(step.startTime),
      duration: createDuration(step.duration),
      status: stepStatus,
      error: step.error ? step.error.message || "" : "",
      errors: step.error ? [step.error.message || ""] : [],
      location: step.location
        ? `${step.location.file}:${step.location.line}:${step.location.column}`
        : "",
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
    "/testsystem.v1.observer.TestEventCollector/ReportStepEnd",
    request,
    options.grpcTimeout
  ).catch((e) => console.error("Failed to report step end", e));
}
