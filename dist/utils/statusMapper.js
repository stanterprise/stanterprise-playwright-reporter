"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapTestStatus = mapTestStatus;
exports.mapStepStatus = mapStepStatus;
const protobuf_1 = require("@stanterprise/protobuf");
const TestStatus = protobuf_1.common.v1.common.TestStatus;
/**
 * Map Playwright test status to protobuf TestStatus
 */
function mapTestStatus(status) {
    switch (status) {
        case "passed":
            return TestStatus.PASSED;
        case "failed":
            return TestStatus.FAILED;
        case "skipped":
            return TestStatus.SKIPPED;
        case "timedOut":
            return TestStatus.FAILED; // Treat timeout as failed
        default:
            return TestStatus.UNKNOWN;
    }
}
/**
 * Map step error to test status
 */
function mapStepStatus(hasError) {
    return hasError ? TestStatus.FAILED : TestStatus.PASSED;
}
