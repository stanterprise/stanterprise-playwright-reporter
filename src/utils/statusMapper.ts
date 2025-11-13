/**
 * Utility functions for mapping Playwright types to protobuf types
 */
import type { TestResult } from "@playwright/test/reporter";
import { common } from "@stanterprise/protobuf";

/**
 * Map Playwright test status to protobuf TestStatus
 */
export function mapTestStatus(status: TestResult["status"]): number {
  switch (status) {
    case "passed":
      return common.TestStatus.PASSED;
    case "failed":
      return common.TestStatus.FAILED;
    case "skipped":
      return common.TestStatus.SKIPPED;
    case "timedOut":
      return common.TestStatus.FAILED; // Treat timeout as failed
    default:
      return common.TestStatus.UNKNOWN;
  }
}

/**
 * Map step error to test status
 */
export function mapStepStatus(hasError: boolean): number {
  return hasError ? common.TestStatus.FAILED : common.TestStatus.PASSED;
}
