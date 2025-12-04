"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimestamp = createTimestamp;
exports.createTimestampFromMs = createTimestampFromMs;
exports.createDuration = createDuration;
/**
 * Utility functions for creating timestamps and durations
 */
const protobuf_1 = require("@stanterprise/protobuf");
/**
 * Create a protobuf Timestamp from a JavaScript Date
 */
function createTimestamp(date) {
    return new protobuf_1.google.protobuf.Timestamp({
        seconds: Math.floor(date.getTime() / 1000),
        nanos: (date.getTime() % 1000) * 1000000,
    });
}
/**
 * Create a protobuf Timestamp from milliseconds since epoch
 */
function createTimestampFromMs(ms) {
    return new protobuf_1.google.protobuf.Timestamp({
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
 * The return type is cast to Duration for proper type checking with the schema.
 *
 * @param durationMs Duration in milliseconds
 * @returns A Duration object (implemented as Timestamp due to export limitations)
 */
function createDuration(durationMs) {
    return new protobuf_1.google.protobuf.Timestamp({
        seconds: Math.floor(durationMs / 1000),
        nanos: (durationMs % 1000) * 1000000,
    });
}
