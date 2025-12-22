import { TestSuiteRun } from "@stanterprise/protobuf/testsystem/v1/entities";
import { SuiteEndEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import { reportUnary } from "../client/grpcClient";
import { createTimestamp, createDuration } from "../utils";

export function handleOnSuiteEndEvent() {
  //   // Map result status to protobuf TestStatus
  //   const suiteStatus = this.mapSuiteStatus(result.status);
  //   // Build metadata from suite location
  //   const metadata = new Map<string, string>();
  //   metadata.set("suite_type", suite.type);
  //   metadata.set("final_result", result.status);
  //   if (suite.location) {
  //     metadata.set("location_file", suite.location.file);
  //     metadata.set("location_line", suite.location.line.toString());
  //     metadata.set("location_column", suite.location.column.toString());
  //   }
  //   // Build and send the SuiteEnd event
  //   const request = new SuiteEndEventRequest({
  //     suite: new TestSuiteRun({
  //       id: suiteId,
  //       name: suite.title || "root",
  //       run_id: this.runId,
  //       start_time: createTimestamp(startTime),
  //       end_time: createTimestamp(endTime),
  //       duration: createDuration(duration),
  //       status: suiteStatus,
  //       metadata: metadata,
  //       // Add parent suite ID if not root
  //       parent_suite_id: suite.parent ? getSuiteId(suite.parent) : "",
  //     }),
  //   });
  //   // Fire-and-forget to avoid slowing tests
  //   reportUnary(
  //     "/testsystem.v1.observer.TestEventCollector/ReportSuiteEnd",
  //     request,
  //     this.options.grpcTimeout
  //   ).catch((e) => this.logGrpcErrorOnce("Failed to report suite end", e));
}
