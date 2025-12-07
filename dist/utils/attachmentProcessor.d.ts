/**
 * Utility functions for processing test attachments
 */
import type { TestResult } from "@playwright/test/reporter";
import { common } from "@stanterprise/protobuf";
declare const Attachment: typeof common.v1.common.Attachment;
/**
 * Process Playwright test attachments into protobuf Attachment objects
 */
export declare function processAttachments(result: TestResult): InstanceType<typeof Attachment>[];
/**
 * Extract error information from test results
 */
export declare function extractErrorInfo(result: TestResult): {
    errorMessage: string;
    stackTrace: string;
    errors: string[];
};
export {};
