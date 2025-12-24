import { FullResult } from "@playwright/test/reporter";
import { StanterpriseReporterOptions } from "../types";
import * as grpc from "@grpc/grpc-js";
import { reportUnary } from "../client/grpcClient";
import { createDuration, createTimestampFromMs } from "../utils";
import { TestRunEndEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import { TestStatus } from "@stanterprise/protobuf/testsystem/v1/common";

function mapTestStatus(status: FullResult["status"]): TestStatus {
  switch (status) {
    case "passed":
      return TestStatus.PASSED;
    case "failed":
      return TestStatus.FAILED;
    case "timedout":
      return TestStatus.TIMEDOUT;
    case "interrupted":
      return TestStatus.INTERRUPTED;
    default:
      return TestStatus.UNKNOWN;
  }
}

export function handleOnEndEvent(
  result: FullResult,
  runId: string,
  client: grpc.Client,
  options: StanterpriseReporterOptions
) {
  // Validate and sanitize inputs to prevent serialization failures
  const startTimeMs = result.startTime?.getTime();
  const duration = result.duration;

  // Ensure valid numeric values (protobuf cannot serialize NaN or undefined)
  const validStartTimeMs =
    typeof startTimeMs === "number" && !isNaN(startTimeMs)
      ? startTimeMs
      : Date.now();
  const validDuration =
    typeof duration === "number" && !isNaN(duration) && duration >= 0
      ? duration
      : 0;

  const request = new TestRunEndEventRequest({
    run_id: runId,
    final_status: mapTestStatus(result.status),
    start_time: createTimestampFromMs(validStartTimeMs),
    duration: createDuration(validDuration),
  });
  reportUnary(
    options,
    client,
    "/testsystem.v1.observer.TestEventCollector/ReportRunEnd",
    request,
    options.grpcTimeout
  ).catch((error) => {
    if (error instanceof Error) {
      console.error(`Failed to report end event: ${error.message}`, {
        stack: error.stack,
      });
    } else {
      console.error("Failed to report end event: Unknown error type", {
        error,
      });
    }
  });
}
