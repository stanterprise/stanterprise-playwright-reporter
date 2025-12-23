import { TestError } from "@playwright/test/reporter";
import { StanterpriseReporterOptions } from "../types";
import * as grpc from "@grpc/grpc-js";
import { StdErrorEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import { createTimestampFromMs } from "../utils/timeHelpers";
import { reportUnary } from "../client/grpcClient";

export function handleOnErrorEvent(
  error: TestError,
  runId: string,
  grpcClient: grpc.Client,
  options: StanterpriseReporterOptions
) {
  const request = new StdErrorEventRequest({
    run_id: runId,
    message: error.message,
    timestamp: createTimestampFromMs(Date.now()),
  });
  // Fire-and-forget to avoid slowing tests
  reportUnary(
    options,
    grpcClient,
    "/testsystem.v1.observer.TestEventCollector/ReportStdError",
    request,
    options.grpcTimeout
  ).catch((e) => console.error("Failed to report standard error", e));
}
