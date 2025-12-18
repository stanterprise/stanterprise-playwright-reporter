# P1-03: Add Reporter Unit Tests 🔴

**Priority**: CRITICAL  
**Effort**: 2-3 hours  
**Status**: Not Started

## Problem

Currently only utility functions have unit tests. The main `StanterpriseReporter` class has **zero test coverage**, which means:

- Core reporter logic is untested
- gRPC client interactions are not verified
- Error handling paths are not tested
- Configuration handling is not validated
- Method sequencing is not verified

This is a significant quality gap for production code.

## Solution

Create comprehensive unit tests for the `StanterpriseReporter` class using:

- Mocked Playwright types (`TestCase`, `TestResult`, `Suite`)
- Mocked gRPC client
- Jest spies for method calls
- Edge case and error scenario testing

## Implementation Steps

### Step 1: Create Test Helpers

**File**: `tests/helpers/mocks.ts`

```typescript
import type {
  TestCase,
  TestResult,
  Suite,
  FullConfig,
  FullResult,
  TestStep,
  Location,
} from "@playwright/test/reporter";

/**
 * Create a mock TestCase for testing
 */
export function createMockTestCase(overrides?: Partial<TestCase>): TestCase {
  const defaultLocation: Location = {
    file: "/test/sample.spec.ts",
    line: 10,
    column: 5,
  };

  return {
    id: overrides?.id || "test-id-123",
    title: overrides?.title || "Sample Test",
    location: overrides?.location || defaultLocation,
    parent: overrides?.parent || createMockSuite(),
    titlePath: () => ["Suite", overrides?.title || "Sample Test"],
    tags: overrides?.tags || [],
    annotations: overrides?.annotations || [],
    expectedStatus: "passed",
    timeout: 30000,
    retries: 0,
    repeatEachIndex: 0,
    results: [],
    outcome: () => "expected",
    ok: () => true,
  } as TestCase;
}

/**
 * Create a mock TestResult for testing
 */
export function createMockTestResult(
  overrides?: Partial<TestResult>
): TestResult {
  return {
    status: overrides?.status || "passed",
    duration: overrides?.duration || 1000,
    startTime: overrides?.startTime || new Date(),
    retry: overrides?.retry || 0,
    workerIndex: overrides?.workerIndex || 0,
    parallelIndex: overrides?.parallelIndex || 0,
    errors: overrides?.errors || [],
    attachments: overrides?.attachments || [],
    steps: overrides?.steps || [],
    stdout: overrides?.stdout || [],
    stderr: overrides?.stderr || [],
    annotations: overrides?.annotations || [],
  } as TestResult;
}

/**
 * Create a mock Suite for testing
 */
export function createMockSuite(overrides?: Partial<Suite>): Suite {
  const suite: Partial<Suite> = {
    title: overrides?.title || "Test Suite",
    type: overrides?.type || "describe",
    location: overrides?.location,
    parent: overrides?.parent,
    suites: overrides?.suites || [],
    tests: overrides?.tests || [],
    titlePath: () => [overrides?.title || "Test Suite"],
    allTests: () => overrides?.tests || [],
    entries: () => [],
  };

  return suite as Suite;
}

/**
 * Create a mock TestStep for testing
 */
export function createMockTestStep(overrides?: Partial<TestStep>): TestStep {
  return {
    title: overrides?.title || "Step 1",
    category: overrides?.category || "test.step",
    startTime: overrides?.startTime || new Date(),
    duration: overrides?.duration || 100,
    error: overrides?.error,
    parent: overrides?.parent,
    location: overrides?.location,
    steps: overrides?.steps || [],
    annotations: overrides?.annotations || [],
  } as TestStep;
}

/**
 * Create a mock FullConfig for testing
 */
export function createMockFullConfig(
  overrides?: Partial<FullConfig>
): FullConfig {
  return {
    rootDir: "/test/project",
    forbidOnly: false,
    fullyParallel: false,
    globalSetup: null,
    globalTeardown: null,
    globalTimeout: 0,
    grep: /.*/,
    grepInvert: null,
    maxFailures: 0,
    metadata: {},
    preserveOutput: "always",
    projects: [],
    reporter: [],
    reportSlowTests: null,
    quiet: false,
    shard: null,
    updateSnapshots: "missing",
    version: "1.40.0",
    workers: 1,
    webServer: null,
    configFile: "/test/playwright.config.ts",
    ...overrides,
  } as FullConfig;
}

/**
 * Create a mock FullResult for testing
 */
export function createMockFullResult(
  overrides?: Partial<FullResult>
): FullResult {
  return {
    status: overrides?.status || "passed",
    startTime: overrides?.startTime || new Date(),
    duration: overrides?.duration || 5000,
    ...overrides,
  } as FullResult;
}
```

### Step 2: Create Reporter Unit Tests

**File**: `tests/reporter.test.ts`

```typescript
import StanterpriseReporter from "../src/reporter";
import * as grpc from "@grpc/grpc-js";
import {
  createMockTestCase,
  createMockTestResult,
  createMockSuite,
  createMockFullConfig,
  createMockFullResult,
  createMockTestStep,
} from "./helpers/mocks";

// Mock the gRPC module
jest.mock("@grpc/grpc-js");

describe("StanterpriseReporter", () => {
  let reporter: StanterpriseReporter;
  let mockGrpcClient: jest.Mocked<grpc.Client>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock gRPC client
    mockGrpcClient = {
      close: jest.fn(),
      makeUnaryRequest: jest.fn(
        (
          path,
          serialize,
          deserialize,
          message,
          metadata,
          options,
          callback
        ) => {
          // Simulate successful response
          callback(null, Buffer.alloc(0));
        }
      ),
    } as any;

    // Mock gRPC.Client constructor
    (grpc.Client as jest.MockedClass<typeof grpc.Client>).mockImplementation(
      () => mockGrpcClient
    );
  });

  describe("Constructor", () => {
    it("should initialize with default options", () => {
      reporter = new StanterpriseReporter();

      expect(reporter).toBeDefined();
      expect(reporter["grpcAddress"]).toBe("localhost:50051");
      expect(reporter["grpcEnabled"]).toBe(true);
      expect(reporter["grpcTimeout"]).toBe(1000);
      expect(reporter["verbose"]).toBe(false);
    });

    it("should initialize with custom options", () => {
      reporter = new StanterpriseReporter({
        grpcAddress: "custom.server:9090",
        grpcEnabled: false,
        grpcTimeout: 2000,
        verbose: true,
      });

      expect(reporter["grpcAddress"]).toBe("custom.server:9090");
      expect(reporter["grpcEnabled"]).toBe(false);
      expect(reporter["grpcTimeout"]).toBe(2000);
      expect(reporter["verbose"]).toBe(true);
    });

    it("should respect STANTERPRISE_GRPC_ADDRESS env var", () => {
      process.env.STANTERPRISE_GRPC_ADDRESS = "env.server:8080";
      reporter = new StanterpriseReporter();

      expect(reporter["grpcAddress"]).toBe("env.server:8080");
      delete process.env.STANTERPRISE_GRPC_ADDRESS;
    });

    it("should respect STANTERPRISE_GRPC_ENABLED env var", () => {
      process.env.STANTERPRISE_GRPC_ENABLED = "false";
      reporter = new StanterpriseReporter();

      expect(reporter["grpcEnabled"]).toBe(false);
      delete process.env.STANTERPRISE_GRPC_ENABLED;
    });
  });

  describe("onBegin()", () => {
    beforeEach(() => {
      reporter = new StanterpriseReporter({
        grpcEnabled: true,
        verbose: false,
      });
    });

    it("should generate unique run ID", () => {
      const suite = createMockSuite();
      const config = createMockFullConfig();

      reporter.onBegin(config, suite);

      const runId = reporter.getRunId();
      expect(runId).toBeDefined();
      expect(typeof runId).toBe("string");
      expect(runId.length).toBeGreaterThan(0);
    });

    it("should store run start time", () => {
      const suite = createMockSuite();
      const config = createMockFullConfig();
      const beforeTime = new Date();

      reporter.onBegin(config, suite);

      const startTime = reporter.getRunStartTime();
      expect(startTime).toBeDefined();
      expect(startTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it("should create gRPC client when enabled", () => {
      const suite = createMockSuite();
      const config = createMockFullConfig();

      reporter.onBegin(config, suite);

      expect(grpc.Client).toHaveBeenCalledWith(
        "localhost:50051",
        expect.anything()
      );
    });

    it("should not create gRPC client when disabled", () => {
      reporter = new StanterpriseReporter({ grpcEnabled: false });
      const suite = createMockSuite();
      const config = createMockFullConfig();

      reporter.onBegin(config, suite);

      expect(grpc.Client).not.toHaveBeenCalled();
    });

    it("should handle gRPC client creation errors", () => {
      (grpc.Client as jest.MockedClass<typeof grpc.Client>).mockImplementation(
        () => {
          throw new Error("Connection failed");
        }
      );

      const suite = createMockSuite();
      const config = createMockFullConfig();

      // Should not throw
      expect(() => reporter.onBegin(config, suite)).not.toThrow();
    });
  });

  describe("onTestBegin()", () => {
    beforeEach(() => {
      reporter = new StanterpriseReporter({ verbose: false });
      const suite = createMockSuite();
      const config = createMockFullConfig();
      reporter.onBegin(config, suite);
    });

    it("should send TestBeginEvent via gRPC", async () => {
      const test = createMockTestCase();
      const result = createMockTestResult();

      reporter.onTestBegin(test, result);

      // Wait for async gRPC call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGrpcClient.makeUnaryRequest).toHaveBeenCalled();
      const callArgs = (mockGrpcClient.makeUnaryRequest as jest.Mock).mock
        .calls[0];
      expect(callArgs[0]).toContain("ReportTestBegin");
    });

    it("should not log when verbose is false", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const test = createMockTestCase();
      const result = createMockTestResult();

      reporter.onTestBegin(test, result);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should log when verbose is true", () => {
      reporter = new StanterpriseReporter({ verbose: true });
      const suite = createMockSuite();
      const config = createMockFullConfig();
      reporter.onBegin(config, suite);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const test = createMockTestCase();
      const result = createMockTestResult();

      reporter.onTestBegin(test, result);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("onTestEnd()", () => {
    beforeEach(() => {
      reporter = new StanterpriseReporter({ verbose: false });
      const suite = createMockSuite();
      const config = createMockFullConfig();
      reporter.onBegin(config, suite);
    });

    it("should send TestEndEvent via gRPC", async () => {
      const test = createMockTestCase();
      const result = createMockTestResult({ status: "passed" });

      reporter.onTestEnd(test, result);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGrpcClient.makeUnaryRequest).toHaveBeenCalled();
      const calls = (mockGrpcClient.makeUnaryRequest as jest.Mock).mock.calls;
      const testEndCall = calls.find((call) =>
        call[0].includes("ReportTestEnd")
      );
      expect(testEndCall).toBeDefined();
    });

    it("should handle test failures", async () => {
      const test = createMockTestCase();
      const result = createMockTestResult({
        status: "failed",
        errors: [{ message: "Test failed", stack: "Error stack" }],
      });

      reporter.onTestEnd(test, result);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGrpcClient.makeUnaryRequest).toHaveBeenCalled();
    });

    it("should process attachments", async () => {
      const test = createMockTestCase();
      const result = createMockTestResult({
        attachments: [
          {
            name: "screenshot",
            contentType: "image/png",
            path: "/tmp/screen.png",
          },
        ],
      });

      reporter.onTestEnd(test, result);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGrpcClient.makeUnaryRequest).toHaveBeenCalled();
    });
  });

  describe("onStepBegin() and onStepEnd()", () => {
    beforeEach(() => {
      reporter = new StanterpriseReporter({ verbose: false });
      const suite = createMockSuite();
      const config = createMockFullConfig();
      reporter.onBegin(config, suite);
    });

    it("should send StepBeginEvent via gRPC", async () => {
      const test = createMockTestCase();
      const result = createMockTestResult();
      const step = createMockTestStep();

      await reporter.onStepBegin(test, result, step);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGrpcClient.makeUnaryRequest).toHaveBeenCalled();
      const calls = (mockGrpcClient.makeUnaryRequest as jest.Mock).mock.calls;
      const stepBeginCall = calls.find((call) =>
        call[0].includes("ReportStepBegin")
      );
      expect(stepBeginCall).toBeDefined();
    });

    it("should send StepEndEvent via gRPC", () => {
      const test = createMockTestCase();
      const result = createMockTestResult();
      const step = createMockTestStep();

      reporter.onStepEnd(test, result, step);

      expect(mockGrpcClient.makeUnaryRequest).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      reporter = new StanterpriseReporter({ grpcEnabled: true });
      const suite = createMockSuite();
      const config = createMockFullConfig();
      reporter.onBegin(config, suite);
    });

    it("should handle gRPC errors gracefully", async () => {
      // Mock gRPC error
      mockGrpcClient.makeUnaryRequest = jest.fn(
        (
          path,
          serialize,
          deserialize,
          message,
          metadata,
          options,
          callback
        ) => {
          callback(new Error("gRPC error"), null as any);
        }
      ) as any;

      const test = createMockTestCase();
      const result = createMockTestResult();

      // Should not throw
      expect(() => reporter.onTestBegin(test, result)).not.toThrow();
    });

    it("should log gRPC error only once", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();

      mockGrpcClient.makeUnaryRequest = jest.fn(
        (
          path,
          serialize,
          deserialize,
          message,
          metadata,
          options,
          callback
        ) => {
          callback(new Error("gRPC error"), null as any);
        }
      ) as any;

      const test = createMockTestCase();
      const result = createMockTestResult();

      reporter.onTestBegin(test, result);
      await new Promise((resolve) => setTimeout(resolve, 100));

      reporter.onTestBegin(test, result);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should only warn once
      expect(warnSpy).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });

    it("should disable gRPC after first error", async () => {
      mockGrpcClient.makeUnaryRequest = jest.fn(
        (
          path,
          serialize,
          deserialize,
          message,
          metadata,
          options,
          callback
        ) => {
          callback(new Error("gRPC error"), null as any);
        }
      ) as any;

      const test = createMockTestCase();
      const result = createMockTestResult();

      reporter.onTestBegin(test, result);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(reporter["grpcEnabled"]).toBe(false);
    });
  });

  describe("onEnd()", () => {
    beforeEach(() => {
      reporter = new StanterpriseReporter({ verbose: false });
      const suite = createMockSuite();
      const config = createMockFullConfig();
      reporter.onBegin(config, suite);
    });

    it("should send SuiteEndEvent", async () => {
      const result = createMockFullResult({ status: "passed" });

      await reporter.onEnd(result);

      expect(mockGrpcClient.makeUnaryRequest).toHaveBeenCalled();
    });

    it("should return Promise", async () => {
      const result = createMockFullResult();
      const returnValue = reporter.onEnd(result);

      expect(returnValue).toBeInstanceOf(Promise);
      await returnValue;
    });
  });

  describe("onExit()", () => {
    beforeEach(() => {
      reporter = new StanterpriseReporter();
      const suite = createMockSuite();
      const config = createMockFullConfig();
      reporter.onBegin(config, suite);
    });

    it("should close gRPC client", async () => {
      await reporter.onExit();

      expect(mockGrpcClient.close).toHaveBeenCalled();
    });

    it("should log completion message", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await reporter.onExit();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Test run completed")
      );
      consoleSpy.mockRestore();
    });

    it("should handle errors during cleanup", async () => {
      mockGrpcClient.close = jest.fn(() => {
        throw new Error("Cleanup error");
      });

      // Should not throw
      await expect(reporter.onExit()).resolves.not.toThrow();
    });
  });
});
```

### Step 3: Update Test Scripts

**File**: `package.json`

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --selectProjects=unit",
    "test:integration": "jest --selectProjects=integration",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Step 4: Update Coverage Configuration

**File**: `jest.config.js`

Ensure reporter.ts is included in coverage:

```javascript
collectCoverageFrom: [
  "src/**/*.ts",
  "!src/**/*.d.ts",
  "!src/index.ts" // This is just re-exports
],
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Check coverage
npm run test:coverage
```

### Expected Coverage

After completing this task, target coverage:

- **Reporter class**: >80% line coverage
- **Overall project**: >85% line coverage

## Acceptance Criteria

- [ ] Test helpers/mocks created for all Playwright types
- [ ] Constructor tests complete
- [ ] `onBegin()` tests complete
- [ ] `onTestBegin()` tests complete
- [ ] `onTestEnd()` tests complete
- [ ] `onStepBegin()` and `onStepEnd()` tests complete
- [ ] Error handling tests complete
- [ ] `onEnd()` tests complete
- [ ] `onExit()` tests complete
- [ ] All tests pass
- [ ] Code coverage >80% for reporter class
- [ ] Tests verify logging behavior (verbose flag)

## Files to Create

- `tests/helpers/mocks.ts`
- `tests/reporter.test.ts`

## Files to Modify

- `jest.config.js` (ensure proper coverage)
- `package.json` (may need test scripts update)

## Dependencies

- Should be done alongside P1-01 (console logging fix)
- Complements P1-02 (integration tests)

## Related Tasks

- P1-01: Fix Console Logging (tests verify verbose flag)
- P1-02: Add Integration Tests (tests different level)
- P2-04: Fix Type Safety (tests may reveal type issues)

---

_Created: December 17, 2025_
