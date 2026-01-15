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
 * @param maxAttachmentSize Maximum size for attachment content (default 1MB, reduced from 10MB)
 */
export function processAttachments(
  result: TestResult,
  maxAttachmentSize: number = 1048576 // 1MB default (reduced from 10MB to prevent large payloads)
): InstanceType<typeof Attachment>[] {
  const attachments: InstanceType<typeof Attachment>[] = [];

  if (!result.attachments || result.attachments.length === 0) {
    return attachments;
  }

  let totalAttachmentSize = 0;
  const MAX_TOTAL_ATTACHMENT_SIZE = 2097152; // 2MB total limit across all attachments

  for (const attachment of result.attachments) {
    const att = new Attachment({
      name: attachment.name,
      mime_type: attachment.contentType,
    });

    // Always prefer path if available to avoid large payloads
    if (attachment.path) {
      att.uri = attachment.path;
      attachments.push(att);
      continue;
    }

    if (attachment.body) {
      const bodySize = attachment.body.length;

      // Check individual attachment size
      if (bodySize > maxAttachmentSize) {
        console.warn(
          `Attachment "${attachment.name}" (${(bodySize / BYTES_PER_MB).toFixed(
            2
          )}MB) exceeds max size ` +
            `(${(maxAttachmentSize / BYTES_PER_MB).toFixed(
              2
            )}MB) and has no path. Skipping content.`
        );
        // Still add the attachment metadata without content
        attachments.push(att);
        continue;
      }

      // Check total accumulated size
      if (totalAttachmentSize + bodySize > MAX_TOTAL_ATTACHMENT_SIZE) {
        console.warn(
          `Attachment "${attachment.name}" (${(bodySize / BYTES_PER_MB).toFixed(
            2
          )}MB) would exceed total attachment size limit ` +
            `(${(MAX_TOTAL_ATTACHMENT_SIZE / BYTES_PER_MB).toFixed(
              2
            )}MB). Skipping content.`
        );
        attachments.push(att);
        continue;
      }

      // Include content if within limits
      att.content = attachment.body;
      totalAttachmentSize += bodySize;
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
