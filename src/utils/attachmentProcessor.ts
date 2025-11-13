/**
 * Utility functions for processing test attachments
 */
import type { TestResult } from "@playwright/test/reporter";
import { common } from "@stanterprise/protobuf";

/**
 * Process Playwright test attachments into protobuf Attachment objects
 */
export function processAttachments(
  result: TestResult
): InstanceType<typeof common.Attachment>[] {
  const attachments: InstanceType<typeof common.Attachment>[] = [];

  if (!result.attachments || result.attachments.length === 0) {
    return attachments;
  }

  for (const attachment of result.attachments) {
    const att = new common.Attachment({
      name: attachment.name,
      mime_type: attachment.contentType,
    });

    // Use path as URI if available, otherwise use the body content
    if (attachment.path) {
      att.uri = attachment.path;
    } else if (attachment.body) {
      att.content = attachment.body;
    }

    attachments.push(att);
  }

  return attachments;
}

/**
 * Extract error information from test results
 */
export function extractErrorInfo(result: TestResult): {
  errorMessage: string;
  stackTrace: string;
  errors: string[];
} {
  let errorMessage = "";
  let stackTrace = "";
  const errors: string[] = [];

  if (result.errors && result.errors.length > 0) {
    errorMessage = result.errors.map((e) => e.message || "").join("\n");
    stackTrace = result.errors.map((e) => e.stack || "").join("\n");
    errors.push(...result.errors.map((e) => e.message || ""));
  }

  return { errorMessage, stackTrace, errors };
}
