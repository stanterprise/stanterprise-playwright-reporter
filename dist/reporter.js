"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const protobuf_1 = require("@stanterprise/protobuf");
const grpc = __importStar(require("@grpc/grpc-js"));
const crypto_1 = require("crypto");
const utils_1 = require("./utils");
// Create shortcuts for the protobuf classes
const EventsNS = protobuf_1.events.v1.events;
const TestCaseEntities = protobuf_1.testCase.v1.entities;
const TestSuiteEntities = protobuf_1.testSuite.v1.entities;
const TestStatus = protobuf_1.common.v1.common.TestStatus;
class StanterpriseReporter {
    constructor(options = {}) {
        // Generic gRPC client (we call unary methods by path directly).
        this.grpcClient = null;
        this.grpcFirstErrorLogged = false;
        // Generate a unique run ID for this test run
        this.runId = "";
        this.runStartTime = new Date();
        this.rootSuite = null;
        // Track reported suites to ensure we only report each suite once and can reference correct IDs
        this.reportedSuites = new Map();
        this.grpcAddress =
            options.grpcAddress ||
                process.env.STANTERPRISE_GRPC_ADDRESS ||
                "localhost:50051";
        this.grpcEnabled =
            options.grpcEnabled ??
                (process.env.STANTERPRISE_GRPC_ENABLED || "true").toLowerCase() !==
                    "false";
        this.grpcTimeout = options.grpcTimeout || 1000;
        this.verbose = options.verbose || false;
        if (this.verbose) {
            console.log("Stanterprise Reporter: Initialized with options:", {
                grpcAddress: this.grpcAddress,
                grpcEnabled: this.grpcEnabled,
                grpcTimeout: this.grpcTimeout,
                verbose: this.verbose,
            });
        }
    }
    onBegin(config, suite) {
        // Generate a UUID for runId
        this.runId = (0, crypto_1.randomUUID)();
        this.rootSuite = suite;
        // Lazily create the client if enabled.
        if (this.grpcEnabled) {
            try {
                this.grpcClient = new grpc.Client(this.grpcAddress, grpc.credentials.createInsecure());
            }
            catch (e) {
                this.logGrpcErrorOnce("Failed to create gRPC client", e);
            }
        }
        else {
            if (this.verbose) {
                console.log("Stanterprise Reporter: gRPC disabled via STANTERPRISE_GRPC_ENABLED=false");
            }
        }
        if (this.verbose) {
            console.log(`Stanterprise Reporter: Test run started with ID: ${this.runId}`);
            console.log(`Number of tests: ${suite.allTests().length}`);
            console.log(`Run started at: ${this.runStartTime.toISOString()}`);
        }
        // Report root suite begin and track its ID
        const rootSuiteId = this.getSuiteId(suite);
        // Report the suite begin event
        this.reportSuiteBegin(suite, rootSuiteId);
    }
    async onExit() {
        console.log(`Stanterprise Reporter: Test run completed - Run ID: ${this.runId}`);
        // Cleanup gRPC client
        try {
            this.grpcClient?.close();
        }
        catch (e) {
            console.error("Stanterprise Reporter: Error during gRPC client cleanup in onExit:", e);
        }
    }
    // Getter to access the current run ID
    getRunId() {
        return this.runId;
    }
    // Getter to access the run start time
    getRunStartTime() {
        return this.runStartTime;
    }
    onEnd(result) {
        const runDuration = Date.now() - this.runStartTime.getTime();
        console.log(`Stanterprise Reporter: Test run ended - Run ID: ${this.runId}`);
        console.log(`Final result: ${result.status}`);
        console.log(`Run duration: ${runDuration}ms (Playwright duration: ${result.duration}ms)`);
        console.log(`Run start time: ${this.runStartTime.toISOString()}`);
        console.log(`Playwright start time: ${result.startTime.toISOString()}`);
        // Report root suite end
        if (this.rootSuite) {
            this.reportSuiteEnd(this.rootSuite, result);
        }
        return Promise.resolve();
    }
    onTestBegin(test, result) {
        // Create unique test execution ID combining run ID and test ID
        const uniqueTestExecutionId = `${this.runId}-${test.id}`;
        console.log(`Stanterprise Reporter: Test started - ${test.title}`);
        console.log(`  Run ID: ${this.runId}`);
        console.log(`  Test ID (static): ${test.id}`);
        console.log(`  Unique Execution ID: ${uniqueTestExecutionId}`);
        // Get test suite run ID from parent suite if available, ensuring suite is reported
        const testSuiteRunId = test.parent ? this.getSuiteId(test.parent) : "";
        // Build metadata from test annotations
        const metadata = new Map();
        test.annotations.forEach((annotation, index) => {
            metadata.set(`annotation_${index}_type`, annotation.type);
            if (annotation.description) {
                metadata.set(`annotation_${index}_description`, annotation.description);
            }
        });
        // Build and send the TestBegin event via generic unary call.
        const request = new EventsNS.TestBeginEventRequest({
            test_case: new TestCaseEntities.TestCaseRun({
                id: test.id,
                name: test.title,
                run_id: this.runId,
                test_suite_run_id: testSuiteRunId,
                start_time: (0, utils_1.createTimestamp)(result.startTime),
                metadata: metadata,
                tags: test.tags,
            }),
        });
        // Fire-and-forget to avoid slowing tests; log errors once.
        this.reportUnary("/testsystem.v1.observer.TestEventCollector/ReportTestBegin", request, this.grpcTimeout).catch((e) => this.logGrpcErrorOnce("Failed to report test begin", e));
    }
    async onStepBegin(test, result, step) {
        const uniqueTestExecutionId = `${this.runId}-${test.id}`;
        const uniqueStepId = `${uniqueTestExecutionId}-${step.title}-${step.startTime.getTime()}`;
        console.log(`Stanterprise Reporter: Step started - ${step.title}`);
        console.log(`  Category: ${step.category}`);
        // Build metadata from step annotations
        const metadata = new Map();
        metadata.set("category", step.category);
        step.annotations.forEach((annotation, index) => {
            metadata.set(`annotation_${index}_type`, annotation.type);
            if (annotation.description) {
                metadata.set(`annotation_${index}_description`, annotation.description);
            }
        });
        // Get parent step ID if this step has a parent
        const parentStepId = step.parent
            ? `${uniqueTestExecutionId}-${step.parent.title}-${step.parent.startTime.getTime()}`
            : "";
        // Build and send the StepBegin event
        const request = new EventsNS.StepBeginEventRequest({
            step: new TestCaseEntities.StepRun({
                id: uniqueStepId,
                run_id: this.runId,
                test_case_run_id: uniqueTestExecutionId,
                title: step.title,
                type: step.category,
                start_time: (0, utils_1.createTimestamp)(step.startTime),
                location: step.location
                    ? `${step.location.file}:${step.location.line}:${step.location.column}`
                    : "",
                metadata: metadata,
                parent_step_id: parentStepId,
                worker_index: result.workerIndex.toString(),
            }),
        });
        // Fire-and-forget to avoid slowing tests
        this.reportUnary("/testsystem.v1.observer.TestEventCollector/ReportStepBegin", request, this.grpcTimeout).catch((e) => this.logGrpcErrorOnce("Failed to report step begin", e));
    }
    onStepEnd(test, result, step) {
        const uniqueTestExecutionId = `${this.runId}-${test.id}`;
        const uniqueStepId = `${uniqueTestExecutionId}-${step.title}-${step.startTime.getTime()}`;
        console.log(`Stanterprise Reporter: Step ended - ${step.title}`);
        console.log(`  Duration: ${step.duration}ms`);
        // Map step error to status
        const stepStatus = (0, utils_1.mapStepStatus)(!!step.error);
        // Build metadata from step annotations
        const metadata = new Map();
        metadata.set("category", step.category);
        step.annotations.forEach((annotation, index) => {
            metadata.set(`annotation_${index}_type`, annotation.type);
            if (annotation.description) {
                metadata.set(`annotation_${index}_description`, annotation.description);
            }
        });
        // Get parent step ID if this step has a parent
        const parentStepId = step.parent
            ? `${uniqueTestExecutionId}-${step.parent.title}-${step.parent.startTime.getTime()}`
            : "";
        // Build and send the StepEnd event
        const request = new EventsNS.StepEndEventRequest({
            step: new TestCaseEntities.StepRun({
                id: uniqueStepId,
                run_id: this.runId,
                test_case_run_id: uniqueTestExecutionId,
                title: step.title,
                type: step.category,
                start_time: (0, utils_1.createTimestamp)(step.startTime),
                duration: (0, utils_1.createDuration)(step.duration),
                status: stepStatus,
                error: step.error ? step.error.message || "" : "",
                errors: step.error ? [step.error.message || ""] : [],
                location: step.location
                    ? `${step.location.file}:${step.location.line}:${step.location.column}`
                    : "",
                metadata: metadata,
                parent_step_id: parentStepId,
                worker_index: result.workerIndex.toString(),
            }),
        });
        // Fire-and-forget to avoid slowing tests
        this.reportUnary("/testsystem.v1.observer.TestEventCollector/ReportStepEnd", request, this.grpcTimeout).catch((e) => this.logGrpcErrorOnce("Failed to report step end", e));
    }
    onTestEnd(test, result) {
        const uniqueTestExecutionId = `${this.runId}-${test.id}`;
        console.log(`Stanterprise Reporter: Test ended - ${test.title}`);
        console.log(`  Status: ${result.status}`);
        console.log(`  Duration: ${result.duration}ms`);
        // Map Playwright test status to protobuf TestStatus
        const testStatus = (0, utils_1.mapTestStatus)(result.status);
        // Process attachments (screenshots, videos, etc.)
        const attachments = (0, utils_1.processAttachments)(result);
        // Extract error information if the test failed
        const { errorMessage, stackTrace, errors } = (0, utils_1.extractErrorInfo)(result);
        // Get test suite run ID from parent suite if available, ensuring suite is reported
        const testSuiteRunId = test.parent ? this.getSuiteId(test.parent) : "";
        // Build metadata from test annotations and result metadata
        const metadata = new Map();
        test.annotations.forEach((annotation, index) => {
            metadata.set(`annotation_${index}_type`, annotation.type);
            if (annotation.description) {
                metadata.set(`annotation_${index}_description`, annotation.description);
            }
        });
        result.annotations.forEach((annotation, index) => {
            metadata.set(`result_annotation_${index}_type`, annotation.type);
            if (annotation.description) {
                metadata.set(`result_annotation_${index}_description`, annotation.description);
            }
        });
        // Build and send the TestEnd event
        const request = new EventsNS.TestEndEventRequest({
            test_case: new TestCaseEntities.TestCaseRun({
                id: test.id,
                name: test.title,
                run_id: this.runId,
                test_suite_run_id: testSuiteRunId,
                status: testStatus,
                start_time: (0, utils_1.createTimestamp)(result.startTime),
                attachments: attachments,
                error_message: errorMessage,
                stack_trace: stackTrace,
                errors: errors,
                metadata: metadata,
                tags: test.tags,
            }),
        });
        // Fire-and-forget to avoid slowing tests
        this.reportUnary("/testsystem.v1.observer.TestEventCollector/ReportTestEnd", request, this.grpcTimeout).catch((e) => this.logGrpcErrorOnce("Failed to report test end", e));
    }
    onTestFail(test, result) {
        const uniqueTestExecutionId = `${this.runId}-${test.id}`;
        if (this.verbose) {
            console.log(`Stanterprise Reporter: Test failed - ${test.title}`);
        }
        // Extract failure details
        const { errorMessage: failureMessage, stackTrace } = (0, utils_1.extractErrorInfo)(result);
        // Process attachments for failed tests
        const attachments = (0, utils_1.processAttachments)(result);
        // Build and send the TestFailure event
        const request = new EventsNS.TestFailureEventRequest({
            test_id: uniqueTestExecutionId,
            failure_message: failureMessage,
            stack_trace: stackTrace,
            timestamp: (0, utils_1.createTimestampFromMs)(Date.now()),
            attachments: attachments,
        });
        // Fire-and-forget to avoid slowing tests
        this.reportUnary("/testsystem.v1.observer.TestEventCollector/ReportTestFailure", request, this.grpcTimeout).catch((e) => this.logGrpcErrorOnce("Failed to report test failure", e));
    }
    onError(error) {
        console.error("Stanterprise Reporter: An error occurred during the test run");
        console.error(`Error: ${error.message}`);
        if (error.stack) {
            console.error(`Stack trace: ${error.stack}`);
        }
    }
    onStdErr(chunk, test, result) {
        console.error(`Stanterprise Reporter: Standard error output - ${chunk.toString()}`);
    }
    onStdOut(chunk, test, result) {
        // console.log(`Stanterprise Reporter: Standard output - ${chunk.toString()}`);
    }
    // Helper: Get suite ID for a suite, ensuring it's been reported
    getSuiteId(suite) {
        // Check if we've already reported this suite
        if (this.reportedSuites.has(suite)) {
            return this.reportedSuites.get(suite);
        }
        // Generate a unique suite ID based on suite hierarchy
        const titlePath = suite.titlePath().join("/") || "root";
        const suiteId = `${this.runId}-suite-${titlePath}`;
        // Track that we've reported this suite
        this.reportedSuites.set(suite, suiteId);
        return suiteId;
    }
    // Helper: Report suite begin event
    reportSuiteBegin(suite, suiteId) {
        const id = suiteId || `${this.runId}-suite-${suite.title || "root"}`;
        console.log(`Stanterprise Reporter: Suite started - ${suite.title || "root"}`);
        console.log(`  Suite type: ${suite.type}`);
        // Build metadata from suite location
        const metadata = new Map();
        metadata.set("suite_type", suite.type);
        if (suite.location) {
            metadata.set("location_file", suite.location.file);
            metadata.set("location_line", suite.location.line.toString());
            metadata.set("location_column", suite.location.column.toString());
        }
        // Build and send the SuiteBegin event
        const request = new EventsNS.SuiteBeginEventRequest({
            suite: new TestSuiteEntities.TestSuiteRun({
                id: id,
                name: suite.title || "root",
                start_time: (0, utils_1.createTimestamp)(this.runStartTime),
                metadata: metadata,
            }),
        });
        // Fire-and-forget to avoid slowing tests
        this.reportUnary("/testsystem.v1.observer.TestEventCollector/ReportSuiteBegin", request, this.grpcTimeout).catch((e) => this.logGrpcErrorOnce("Failed to report suite begin", e));
    }
    // Helper: Report suite end event
    reportSuiteEnd(suite, result) {
        const suiteId = `${this.runId}-suite-${suite.title || "root"}`;
        const endTime = new Date();
        const duration = endTime.getTime() - this.runStartTime.getTime();
        console.log(`Stanterprise Reporter: Suite ended - ${suite.title || "root"}`);
        console.log(`  Duration: ${duration}ms`);
        // Map result status to protobuf TestStatus
        const suiteStatus = this.mapSuiteStatus(result.status);
        // Build metadata from suite location
        const metadata = new Map();
        metadata.set("suite_type", suite.type);
        metadata.set("final_result", result.status);
        if (suite.location) {
            metadata.set("location_file", suite.location.file);
            metadata.set("location_line", suite.location.line.toString());
            metadata.set("location_column", suite.location.column.toString());
        }
        // Build and send the SuiteEnd event
        const request = new EventsNS.SuiteEndEventRequest({
            suite: new TestSuiteEntities.TestSuiteRun({
                id: suiteId,
                name: suite.title || "root",
                start_time: (0, utils_1.createTimestamp)(this.runStartTime),
                end_time: (0, utils_1.createTimestamp)(endTime),
                duration: (0, utils_1.createDuration)(duration),
                status: suiteStatus,
                metadata: metadata,
            }),
        });
        // Fire-and-forget to avoid slowing tests
        this.reportUnary("/testsystem.v1.observer.TestEventCollector/ReportSuiteEnd", request, this.grpcTimeout).catch((e) => this.logGrpcErrorOnce("Failed to report suite end", e));
    }
    // Helper: Map FullResult status to protobuf TestStatus
    mapSuiteStatus(status) {
        switch (status) {
            case "passed":
                return TestStatus.PASSED;
            case "failed":
                return TestStatus.FAILED;
            case "timedout":
                return TestStatus.FAILED;
            case "interrupted":
                return TestStatus.BROKEN;
            default:
                return TestStatus.UNKNOWN;
        }
    }
    // Helper: log first gRPC error once and disable further attempts
    logGrpcErrorOnce(prefix, err) {
        if (this.grpcFirstErrorLogged)
            return;
        this.grpcFirstErrorLogged = true;
        const details = err instanceof Error ? `${err.message}` : String(err);
        console.warn(`${prefix}. gRPC disabled for the remainder of the run. Address=${this.grpcAddress}. Details: ${details}`);
        this.grpcEnabled = false;
    }
    // Helper: generic unary call using raw method path
    async reportUnary(path, message, deadlineMs = 1000) {
        if (!this.grpcEnabled || !this.grpcClient) {
            return Buffer.alloc(0);
        }
        const reqSerialize = (arg) => {
            const m = arg;
            const bytes = m?.serializeBinary
                ? m.serializeBinary()
                : m?.serialize
                    ? m.serialize()
                    : new Uint8Array(0);
            return Buffer.from(bytes);
        };
        const resDeserialize = (bytes) => bytes;
        const metadata = new grpc.Metadata();
        const callOptions = {
            deadline: new Date(Date.now() + deadlineMs),
        };
        return new Promise((resolve, reject) => {
            try {
                this.grpcClient.makeUnaryRequest(path, reqSerialize, resDeserialize, message, metadata, callOptions, (err, response) => {
                    if (err)
                        return reject(err);
                    resolve(response);
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
}
exports.default = StanterpriseReporter;
