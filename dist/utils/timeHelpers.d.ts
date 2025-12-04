/**
 * Utility functions for creating timestamps and durations
 */
import { google } from "@stanterprise/protobuf";
import type { google as googleTypes } from "@stanterprise/protobuf/dist/lib/google/protobuf/duration";
/**
 * Create a protobuf Timestamp from a JavaScript Date
 */
export declare function createTimestamp(date: Date): InstanceType<typeof google.protobuf.Timestamp>;
/**
 * Create a protobuf Timestamp from milliseconds since epoch
 */
export declare function createTimestampFromMs(ms: number): InstanceType<typeof google.protobuf.Timestamp>;
/**
 * Create a duration object from milliseconds.
 *
 * NOTE: google.protobuf.Duration is defined in the @stanterprise/protobuf schema
 * but not exported in the package's main barrel export. Since Duration and Timestamp
 * have identical structure (seconds: number, nanos: number) and the protobuf serialization
 * is wire-compatible, we use Timestamp as a Duration substitute. This works correctly at runtime.
 * The return type is cast to Duration for proper type checking with the schema.
 *
 * @param durationMs Duration in milliseconds
 * @returns A Duration object (implemented as Timestamp due to export limitations)
 */
export declare function createDuration(durationMs: number): googleTypes.protobuf.Duration;
