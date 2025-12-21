import { Suite } from "@playwright/test/reporter";
import { events, testCase, testSuite, common } from "@stanterprise/protobuf";
import { createTimestamp } from "./timeHelpers";

const EventsNS = events.v1.events;
const TestCaseEntities = testCase.v1.entities;
const TestSuiteEntities = testSuite.v1.entities;
type SuiteType = testSuite.v1.entities.SuiteType;

export function mapSuite(
  suite: Suite,
  runId: string,
  parentSuiteId?: string
): testSuite.v1.entities.TestSuiteRun {
  let type: SuiteType;
  switch (suite.type) {
    case "root":
      type = testSuite.v1.entities.SuiteType.ROOT;
      break;
    case "describe":
      type = testSuite.v1.entities.SuiteType.SUBSUITE;
      break;
    case "file":
      type = testSuite.v1.entities.SuiteType.SUBSUITE;
      break;
    case "project":
      type = testSuite.v1.entities.SuiteType.PROJECT;
      break;
  }
  const suiteId = generateSuiteId(suite);
  const suiteObject = new testSuite.v1.entities.TestSuiteRun({
    // id: suite.id,
    id: suiteId,
    name: suite.title,
    run_id: runId,
    parent_suite_id: parentSuiteId,
    sub_suites: suite.suites.map((childSuite) =>
      mapSuite(childSuite, runId, suiteId)
    ),
    test_cases: suite.tests.map(
      (test) =>
        new TestCaseEntities.TestCaseRun({
          id: test.id,
          name: test.title,
          run_id: runId,
        })
    ),
    type: type,
    // id: this.getSuiteId(suite),
    // parent_suite_id: suite.parent ? this.getSuiteId(suite.parent) : "",
    // start_time: createTimestamp(startTime),
    // metadata: metadata,
  });
  return suiteObject;
}

function generateSuiteId(suite: Suite): string {
  return suite.title ? suite.title.replace(/\s+/g, "_").toLowerCase() : "root";
}
