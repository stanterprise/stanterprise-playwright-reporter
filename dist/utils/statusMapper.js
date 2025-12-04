"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapTestStatus = mapTestStatus;
exports.mapStepStatus = mapStepStatus;
const protobuf_1 = require("@stanterprise/protobuf");
/**
 * Map Playwright test status to protobuf TestStatus
 */
function mapTestStatus(status) {
    switch (status) {
        case "passed":
            return protobuf_1.common.TestStatus.PASSED;
        case "failed":
            return protobuf_1.common.TestStatus.FAILED;
        case "skipped":
            return protobuf_1.common.TestStatus.SKIPPED;
        case "timedOut":
            return protobuf_1.common.TestStatus.FAILED; // Treat timeout as failed
        default:
            return protobuf_1.common.TestStatus.UNKNOWN;
    }
}
/**
 * Map step error to test status
 */
function mapStepStatus(hasError) {
    return hasError ? protobuf_1.common.TestStatus.FAILED : protobuf_1.common.TestStatus.PASSED;
}
