import { FullConfig } from "@playwright/test";
import { Suite } from "@playwright/test/reporter";
import { MapTestRunEventRequest } from "@stanterprise/protobuf/testsystem/v1/events";
import { StanterpriseReporterOptions } from "../types";
import * as grpc from "@grpc/grpc-js";
import { reportUnary } from "../client/grpcClient";
import {
  TestSuiteRun,
  SuiteType,
  TestCaseRun,
} from "@stanterprise/protobuf/testsystem/v1/entities";
import { generateSuiteId } from "../utils";

export function handleOnBeginEvent(
  config: FullConfig,
  suite: Suite,
  runId: string,
  client: grpc.Client,
  options: StanterpriseReporterOptions
) {
  // Report root suite and all child suites recursively
  const request = new MapTestRunEventRequest({
    run_id: runId,
    test_suites: mapSuites(suite, runId),
  });
  reportUnary(
    options,
    client,
    "/testsystem.v1.observer.TestEventCollector/MapTestRun",
    request,
    options.grpcTimeout
  ).catch((e) => {
    const details = e instanceof Error ? `${e.message}` : String(e);
    console.warn(
      `onBegin. gRPC disabled for the remainder of the run. Address=${options.grpcAddress}. Details: ${details}`
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
      type = SuiteType.SUBSUITE;
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
    test_cases: suite.tests.map(
      (test) =>
        new TestCaseRun({
          id: test.id,
          name: test.title,
          run_id: runId,
        })
    ),
    test_case_ids: suite.tests.map((test) => test.id),
    type: type,
    // start_time: createTimestamp(startTime),
    // metadata: metadata,
  });
}
