/**
 * Utility functions for mapping Playwright types to protobuf types
 */
import type { TestResult } from "@playwright/test/reporter";
import { common } from "@stanterprise/protobuf";

const TestStatus = common.v1.common.TestStatus;

/**
 * Map Playwright test status to protobuf TestStatus
 */
export function mapTestStatus(status: TestResult["status"]): number {
  switch (status) {
    case "passed":
      return TestStatus.PASSED;
    case "failed":
      return TestStatus.FAILED;
    case "skipped":
      return TestStatus.SKIPPED;
    case "timedOut":
      return TestStatus.FAILED; // Treat timeout as failed
    default:
      return TestStatus.UNKNOWN;
  }
}

/**
 * Map step error to test status
 */
export function mapStepStatus(hasError: boolean): number {
  return hasError ? TestStatus.FAILED : TestStatus.PASSED;
}
