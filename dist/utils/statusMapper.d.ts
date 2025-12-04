/**
 * Utility functions for mapping Playwright types to protobuf types
 */
import type { TestResult } from "@playwright/test/reporter";
/**
 * Map Playwright test status to protobuf TestStatus
 */
export declare function mapTestStatus(status: TestResult["status"]): number;
/**
 * Map step error to test status
 */
export declare function mapStepStatus(hasError: boolean): number;
