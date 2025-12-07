/**
 * Utility functions for creating timestamps and durations
 */
import { google } from "@stanterprise/protobuf";
declare const Timestamp: typeof google.google.protobuf.Timestamp;
/**
 * Create a protobuf Timestamp from a JavaScript Date
 */
export declare function createTimestamp(date: Date): InstanceType<typeof Timestamp>;
/**
 * Create a protobuf Timestamp from milliseconds since epoch
 */
export declare function createTimestampFromMs(ms: number): InstanceType<typeof Timestamp>;
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
export declare function createDuration(durationMs: number): any;
export {};
