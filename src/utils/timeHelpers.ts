/**
 * Utility functions for creating timestamps and durations
 */
import { google } from "@stanterprise/protobuf";
import { google as googleProtobuf } from "@stanterprise/protobuf/dist/lib/google/protobuf/duration";

/**
 * Create a protobuf Timestamp from a JavaScript Date
 */
export function createTimestamp(date: Date): InstanceType<typeof google.protobuf.Timestamp> {
  return new google.protobuf.Timestamp({
    seconds: Math.floor(date.getTime() / 1000),
    nanos: (date.getTime() % 1000) * 1000000,
  });
}

/**
 * Create a protobuf Timestamp from milliseconds since epoch
 */
export function createTimestampFromMs(ms: number): InstanceType<typeof google.protobuf.Timestamp> {
  return new google.protobuf.Timestamp({
    seconds: Math.floor(ms / 1000),
    nanos: (ms % 1000) * 1000000,
  });
}

/**
 * Create a protobuf Duration from milliseconds
 */
export function createDuration(durationMs: number): InstanceType<typeof googleProtobuf.protobuf.Duration> {
  return new googleProtobuf.protobuf.Duration({
    seconds: Math.floor(durationMs / 1000),
    nanos: (durationMs % 1000) * 1000000,
  });
}
