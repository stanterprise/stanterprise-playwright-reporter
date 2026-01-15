/**
 * Utility functions for building metadata objects
 */
import type { TestCase, TestResult, TestStep } from "@playwright/test/reporter";

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

  annotations.forEach((annotation, index) => {
    metadata[`${prefix}_${index}_type`] = annotation.type;
    if (annotation.description) {
      metadata[`${prefix}_${index}_description`] = annotation.description;
    }
  });

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
