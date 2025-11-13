/**
 * Utility functions for creating timestamps and durations
 */
import { google } from "@stanterprise/protobuf";

// Duration is not exported by @stanterprise/protobuf at runtime.
// We'll use Timestamp as a workaround since it has the same structure (seconds, nanos).
// @ts-ignore - accessing internal google.protobuf which may have Duration
const DurationConstructor = (google.protobuf as any).Duration;

/**
 * Create a protobuf Timestamp from a JavaScript Date
 */
export function createTimestamp(
  date: Date
): InstanceType<typeof google.protobuf.Timestamp> {
  return new google.protobuf.Timestamp({
    seconds: Math.floor(date.getTime() / 1000),
    nanos: (date.getTime() % 1000) * 1000000,
  });
}

/**
 * Create a protobuf Timestamp from milliseconds since epoch
 */
export function createTimestampFromMs(
  ms: number
): InstanceType<typeof google.protobuf.Timestamp> {
  return new google.protobuf.Timestamp({
    seconds: Math.floor(ms / 1000),
    nanos: (ms % 1000) * 1000000,
  });
}

/**
 * Create a duration object from milliseconds
 * WORKAROUND: The @stanterprise/protobuf package doesn't export Duration at runtime.
 * We use Timestamp as a substitute since it has the same structure (seconds, nanos).
 */
export function createDuration(durationMs: number): any {
  // Use Timestamp constructor as fallback (same structure as Duration)
  return new google.protobuf.Timestamp({
    seconds: Math.floor(durationMs / 1000),
    nanos: (durationMs % 1000) * 1000000,
  });
}
