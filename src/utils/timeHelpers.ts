/**
 * Utility functions for creating timestamps and durations
 */
import { google } from "@stanterprise/protobuf";

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
 * Create a duration object from milliseconds
 * Note: Returns a plain object that matches the Duration interface
 */
export function createDuration(durationMs: number): any {
  return {
    seconds: Math.floor(durationMs / 1000),
    nanos: (durationMs % 1000) * 1000000,
  };
}
