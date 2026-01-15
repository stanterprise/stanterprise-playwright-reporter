/**
 * Utility functions for processing test attachments
 */
import type { TestResult } from "@playwright/test/reporter";
import { common } from "@stanterprise/protobuf";

const Attachment = common.v1.common.Attachment;

/**
 * Constant for converting bytes to megabytes
 */
const BYTES_PER_MB = 1048576;

/**
 * Process Playwright test attachments into protobuf Attachment objects
 * @param result Test result containing attachments
 * @param maxAttachmentSize Maximum size for attachment content (default 10MB)
 */
export function processAttachments(
  result: TestResult,
  maxAttachmentSize: number = 10485760 // 10MB default
): InstanceType<typeof Attachment>[] {
  const attachments: InstanceType<typeof Attachment>[] = [];

  if (!result.attachments || result.attachments.length === 0) {
    return attachments;
  }

  for (const attachment of result.attachments) {
    const att = new Attachment({
      name: attachment.name,
      mime_type: attachment.contentType,
    });

    // Always prefer path if available to avoid large payloads
    if (attachment.path) {
      att.uri = attachment.path;
    } else if (attachment.body) {
      // Only include body content if it's within size limit
      const bodySize = attachment.body.length;
      if (bodySize <= maxAttachmentSize) {
        att.content = attachment.body;
      } else {
        // Skip large attachments without path - log warning
        console.warn(
          `Attachment "${attachment.name}" (${(bodySize / BYTES_PER_MB).toFixed(
            2
          )}MB) exceeds max size ` +
            `(${(maxAttachmentSize / BYTES_PER_MB).toFixed(
              2
            )}MB) and has no path. Skipping content.`
        );
        // Still add the attachment metadata without content
      }
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
