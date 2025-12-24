/**
 * Utility functions for creating timestamps and durations
 */
import { google } from "@stanterprise/protobuf";

const Timestamp = google.google.protobuf.Timestamp;

/**
 * Create a protobuf Timestamp from a JavaScript Date
 */
export function createTimestamp(date: Date): InstanceType<typeof Timestamp> {
  const ms = date.getTime();
  // Validate to prevent NaN from causing protobuf serialization failures
  if (isNaN(ms)) {
    throw new Error(
      `Invalid date provided to createTimestamp: ${date.toString()}`
    );
  }
  return new Timestamp({
    seconds: Math.floor(ms / 1000),
    nanos: (ms % 1000) * 1000000,
  });
}

/**
 * Create a protobuf Timestamp from milliseconds since epoch
 */
export function createTimestampFromMs(
  ms: number
): InstanceType<typeof Timestamp> {
  // Validate to prevent NaN from causing protobuf serialization failures
  if (typeof ms !== "number" || isNaN(ms)) {
    throw new Error(
      `Invalid milliseconds provided to createTimestampFromMs: ${ms}`
    );
  }
  return new Timestamp({
    seconds: Math.floor(ms / 1000),
    nanos: (ms % 1000) * 1000000,
  });
}

/**
 * Create a duration object from milliseconds.
 *
 * NOTE: google.protobuf.Duration is defined in the @stanterprise/protobuf schema
 * but not exported in the package's main barrel export. Since Duration and Timestamp
 * have identical structure (seconds: number, nanos: number) and the protobuf serialization
 * is wire-compatible, we use Timestamp as a Duration substitute. This works correctly at runtime.
 *
 * @param durationMs Duration in milliseconds
 * @returns A Duration object (implemented as Timestamp due to export limitations)
 */
export function createDuration(durationMs: number): any {
  // Validate to prevent NaN from causing protobuf serialization failures
  if (typeof durationMs !== "number" || isNaN(durationMs)) {
    throw new Error(
      `Invalid duration provided to createDuration: ${durationMs}`
    );
  }
  if (durationMs < 0) {
    throw new Error(
      `Negative duration provided to createDuration: ${durationMs}`
    );
  }
  return new Timestamp({
    seconds: Math.floor(durationMs / 1000),
    nanos: (durationMs % 1000) * 1000000,
  });
}
