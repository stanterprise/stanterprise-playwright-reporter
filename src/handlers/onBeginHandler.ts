import { FullConfig } from "@playwright/test";
import { Suite } from "@playwright/test/reporter";
import { ReportRunStartEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import { StanterpriseReporterOptions } from "../types";
import * as grpc from "@grpc/grpc-js";
import { reportUnary } from "../client/grpcClient";
import { MessageQueue } from "../client/messageQueue";
import {
  TestSuiteRun,
  SuiteType,
  TestCaseRun,
} from "@stanterprise/protobuf/testsystem/v1/entities";
import { generateSuiteId, getEnvVariables, toMetadataMap } from "../utils";
import { TestStatus } from "@stanterprise/protobuf/testsystem/v1/common";

export function handleOnBeginEvent(
  config: FullConfig,
  suite: Suite,
  name: string,
  runId: string,
  client: grpc.Client,
  options: StanterpriseReporterOptions,
  queue?: MessageQueue,
) {
  // Report root suite and all child suites recursively
  // Convert all metadata values to strings for protobuf compatibility
  // Use plain object instead of Map - protobuf expects object literals
  const metadata: Record<string, string> = {};
  Object.entries(config.metadata || {}).forEach(([key, value]) => {
    metadata[key] = String(value);
  });

  const variables = getEnvVariables();
  // Merge environment variables into metadata
  variables.forEach((value, key) => {
    metadata[key] = value;
  });

  // Add shard information if present
  if (config.shard) {
    metadata["shard.current"] = String(config.shard.current);
    metadata["shard.total"] = String(config.shard.total);
  }

  const request = new ReportRunStartEventRequest({
    run_id: runId,
    name: name,
    test_suites: mapSuites(suite, runId),
    total_tests: suite.allTests().length,
    metadata: toMetadataMap(metadata),
  });

  reportUnary(
    options,
    client,
    "/testsystem.v1.observer.TestEventCollector/ReportRunStart",
    request,
    options.grpcTimeout,
    queue,
  ).catch((e) => {
    const details = e instanceof Error ? `${e.message}` : String(e);
    console.warn(
      `onBegin. gRPC disabled for the remainder of the run. Address=${options.grpcAddress}. Details: ${details}`,
    );
  });
}

function mapSuites(suite: Suite, runId: string): TestSuiteRun[] {
  let allSuites = getAllSuites(suite);

  return allSuites.map((currentSuite) => mapSingleSuite(currentSuite, runId));
}

function getAllSuites(suite: Suite): Suite[] {
  let suites: Suite[] = [];
  suites.push(suite);
  suite.suites.forEach((childSuite) => {
    suites = suites.concat(getAllSuites(childSuite));
  });
  return suites;
}

function mapSingleSuite(suite: Suite, runId: string): TestSuiteRun {
  const suiteId = generateSuiteId(suite);
  const parentSuiteId = suite.parent
    ? generateSuiteId(suite.parent)
    : undefined;

  let type: SuiteType;
  switch (suite.type) {
    case "root":
      type = SuiteType.ROOT;
      break;
    case "describe":
      type = SuiteType.SUBSUITE;
      break;
    case "file":
      type = SuiteType.FILE;
      break;
    case "project":
      type = SuiteType.PROJECT;
      break;
  }

  return new TestSuiteRun({
    id: suiteId,
    name: suite.title,
    run_id: runId,
    parent_suite_id: parentSuiteId,
    status: TestStatus.NOT_RUN,
    test_cases: suite.tests.map(
      (test) =>
        new TestCaseRun({
          id: test.id,
          name: test.title,
          run_id: runId,
          test_suite_id: suiteId,
          tags: test.tags,
          location: test.location
            ? `${test.location.file}:${test.location.line}:${test.location.column}`
            : undefined,
          status: TestStatus.NOT_RUN,
          retry_count: test.retries,
          retry_index: 0,
        }),
    ),
    test_case_ids: suite.tests.map((test) => test.id),
    type: type,
    location: suite.location
      ? `${suite.location.file}:${suite.location.line}:${suite.location.column}`
      : undefined,
  });
}
