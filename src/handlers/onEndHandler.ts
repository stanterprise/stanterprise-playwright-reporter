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
  const request = new TestRunEndEventRequest({
    run_id: runId,
    final_status: mapTestStatus(result.status),
    start_time: createTimestampFromMs(result.startTime.getTime()),
    duration: createDuration(result.duration),
  });
  reportUnary(
    options,
    client,
    "/testsystem.v1.observer.TestEventCollector/ReportEnd",
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
