/**
 * Utility functions for building metadata objects
 */
import type { TestCase, TestResult, TestStep } from "@playwright/test/reporter";

/**
 * Maximum length for a single metadata value (100KB)
 * Large values are often accidentally embedded test data or debug output
 */
const MAX_METADATA_VALUE_LENGTH = 102400;

/**
 * Maximum total metadata size across all values (1MB)
 */
const MAX_TOTAL_METADATA_SIZE = 1048576;

/**
 * Truncate a string to a maximum length with ellipsis indicator
 * @param value String value to truncate
 * @param maxLength Maximum length (default 100KB)
 * @returns Truncated string with warning suffix if truncated
 */
function truncateValue(
  value: string,
  maxLength: number = MAX_METADATA_VALUE_LENGTH
): string {
  if (value.length <= maxLength) {
    return value;
  }
  const truncated = value.substring(0, maxLength - 100);
  return `${truncated}... [TRUNCATED: original length ${
    value.length
  } bytes, showing first ${maxLength - 100} bytes]`;
}

/**
 * Build metadata from annotations array
 * @param annotations Array of annotations with type and optional description
 * @param prefix Prefix for metadata keys (e.g., "annotation", "result_annotation")
 * @returns Record of metadata key-value pairs
 */
export function buildAnnotationsMetadata(
  annotations: Array<{ type: string; description?: string }>,
  prefix: string = "annotation"
): Record<string, string> {
  const metadata: Record<string, string> = {};
  let totalSize = 0;

  for (let index = 0; index < annotations.length; index++) {
    const annotation = annotations[index];
    const typeKey = `${prefix}_${index}_type`;
    const typeValue = annotation.type;

    metadata[typeKey] = typeValue;
    totalSize += typeValue.length;

    if (annotation.description) {
      const descKey = `${prefix}_${index}_description`;
      const descValue = truncateValue(annotation.description);

      // Skip if adding this would exceed total metadata size
      if (totalSize + descValue.length > MAX_TOTAL_METADATA_SIZE) {
        console.warn(
          `Skipping annotation description for ${typeKey}: would exceed total metadata size limit (${MAX_TOTAL_METADATA_SIZE} bytes)`
        );
        continue;
      }

      metadata[descKey] = descValue;
      totalSize += descValue.length;
    }
  }

  return metadata;
}

/**
 * Build metadata from test case and result annotations
 * Combines annotations from both the test case and the result
 * @param test Test case containing annotations
 * @param result Test result containing additional annotations
 * @returns Record of metadata key-value pairs
 */
export function buildTestMetadata(
  test: TestCase,
  result: TestResult
): Record<string, string> {
  return {
    ...buildAnnotationsMetadata(test.annotations, "annotation"),
    ...buildAnnotationsMetadata(result.annotations, "result_annotation"),
  };
}

/**
 * Build metadata from step annotations and category
 * @param step Test step containing annotations and category
 * @returns Record of metadata key-value pairs
 */
export function buildStepMetadata(step: TestStep): Record<string, string> {
  return {
    category: step.category,
    ...buildAnnotationsMetadata(step.annotations, "annotation"),
  };
}

/**
 * Convert metadata object to Map for protobuf serialization
 * Protobuf requires Map<string, string> for metadata fields
 * @param metadata Record of metadata key-value pairs
 * @returns Map ready for protobuf constructors
 */
export function toMetadataMap(
  metadata: Record<string, string>
): Map<string, string> {
  return new Map(Object.entries(metadata));
}
