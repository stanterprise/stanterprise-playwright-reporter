import type { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult, TestStep, TestError } from "@playwright/test/reporter";
import { StanterpriseReporterOptions } from "./types";
export default class StanterpriseReporter implements Reporter {
    private grpcClient;
    private grpcAddress;
    private grpcEnabled;
    private grpcTimeout;
    private grpcFirstErrorLogged;
    private verbose;
    private runId;
    private runStartTime;
    private rootSuite;
    private reportedSuites;
    constructor(options?: StanterpriseReporterOptions);
    onBegin(config: FullConfig, suite: Suite): void;
    onExit(): Promise<void>;
    getRunId(): string;
    getRunStartTime(): Date;
    onEnd(result: FullResult): Promise<{
        status?: FullResult["status"];
    } | undefined | void> | void;
    onTestBegin(test: TestCase, result: TestResult): void;
    onStepBegin(test: TestCase, result: TestResult, step: TestStep): Promise<void>;
    onStepEnd(test: TestCase, result: TestResult, step: TestStep): void;
    onTestEnd(test: TestCase, result: TestResult): void;
    onTestFail(test: TestCase, result: TestResult): void;
    onError(error: TestError): void;
    onStdErr(chunk: string | Buffer, test: void | TestCase, result: void | TestResult): void;
    onStdOut(chunk: string | Buffer, test: void | TestCase, result: void | TestResult): void;
    private getSuiteId;
    private reportSuiteBegin;
    private reportSuiteEnd;
    private mapSuiteStatus;
    private logGrpcErrorOnce;
    private reportUnary;
}
