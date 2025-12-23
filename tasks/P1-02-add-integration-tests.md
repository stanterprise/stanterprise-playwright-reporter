# P1-02: Add Integration Tests 🔴

**Priority**: CRITICAL  
**Effort**: 3-4 hours  
**Status**: ⚠️ NOT STARTED - STILL NEEDED

> **Note**: While the reporter has been refactored with separated handlers, integration tests are still missing. The handler architecture makes testing easier but tests still need to be written.

## Problem

Currently, only utility functions have unit tests. There are **no integration tests** that verify:

- The reporter actually works with real Playwright test execution
- gRPC events are sent with correct data
- Event sequencing is correct
- Error scenarios are handled properly
- The reporter doesn't crash or hang tests

This is a critical gap - we can't be confident the reporter works end-to-end.

## Solution

Create comprehensive integration tests that:

1. Run actual Playwright tests with the reporter enabled
2. Mock the gRPC server to capture events
3. Verify events contain expected data and correct sequence
4. Test error scenarios (server down, timeouts, etc.)

## Implementation Steps

### Step 1: Create Test Infrastructure

**File**: `tests/integration/setup.ts`

```typescript
import * as grpc from "@grpc/grpc-js";
import { EventEmitter } from "events";

/**
 * Mock gRPC server that captures events for testing
 */
export class MockGrpcServer {
  private server: grpc.Server;
  private events: EventEmitter;
  public capturedEvents: any[] = [];
  public port: number = 50051;

  constructor() {
    this.server = new grpc.Server();
    this.events = new EventEmitter();
    this.setupHandlers();
  }

  private setupHandlers() {
    // Generic handler that captures all unary calls
    const handler = (call: any, callback: any) => {
      const event = {
        method: call.metadata.get("method")[0],
        timestamp: new Date(),
        data: call.request,
      };

      this.capturedEvents.push(event);
      this.events.emit("event", event);

      // Return empty success response
      callback(null, {});
    };

    // Add handlers for all test event methods
    const testEventService = {
      ReportTestBegin: handler,
      ReportTestEnd: handler,
      ReportTestFailure: handler,
      ReportStepBegin: handler,
      ReportStepEnd: handler,
      ReportSuiteBegin: handler,
      ReportSuiteEnd: handler,
    };

    this.server.addService(
      {
        // Mock service definition
        ReportTestBegin: {
          path: "/testsystem.v1.observer.TestEventCollector/ReportTestBegin",
          requestStream: false,
          responseStream: false,
        },
        ReportTestEnd: {
          path: "/testsystem.v1.observer.TestEventCollector/ReportTestEnd",
          requestStream: false,
          responseStream: false,
        },
        ReportTestFailure: {
          path: "/testsystem.v1.observer.TestEventCollector/ReportTestFailure",
          requestStream: false,
          responseStream: false,
        },
        ReportStepBegin: {
          path: "/testsystem.v1.observer.TestEventCollector/ReportStepBegin",
          requestStream: false,
          responseStream: false,
        },
        ReportStepEnd: {
          path: "/testsystem.v1.observer.TestEventCollector/ReportStepEnd",
          requestStream: false,
          responseStream: false,
        },
        ReportSuiteBegin: {
          path: "/testsystem.v1.observer.TestEventCollector/ReportSuiteBegin",
          requestStream: false,
          responseStream: false,
        },
        ReportSuiteEnd: {
          path: "/testsystem.v1.observer.TestEventCollector/ReportSuiteEnd",
          requestStream: false,
          responseStream: false,
        },
      } as any,
      testEventService
    );
  }

  async start(port?: number): Promise<void> {
    if (port) this.port = port;

    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `localhost:${this.port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, boundPort) => {
          if (err) {
            reject(err);
          } else {
            this.server.start();
            this.port = boundPort;
            resolve();
          }
        }
      );
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.tryShutdown(() => resolve());
    });
  }

  reset() {
    this.capturedEvents = [];
  }

  waitForEvent(eventType: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${eventType}`));
      }, timeout);

      this.events.once("event", (event) => {
        clearTimeout(timer);
        if (event.method.includes(eventType)) {
          resolve(event);
        }
      });
    });
  }

  getEventsByType(eventType: string): any[] {
    return this.capturedEvents.filter((e) => e.method?.includes(eventType));
  }
}
```

### Step 2: Create Test Fixtures

**File**: `tests/integration/fixtures/sample.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Sample test suite", () => {
  test("passing test", async ({ page }) => {
    expect(1 + 1).toBe(2);
  });

  test("failing test", async ({ page }) => {
    expect(1 + 1).toBe(3);
  });

  test("test with steps", async ({ page }) => {
    await test.step("Step 1", async () => {
      expect(true).toBe(true);
    });

    await test.step("Step 2", async () => {
      expect(false).toBe(false);
    });
  });

  test.skip("skipped test", async ({ page }) => {
    expect(true).toBe(true);
  });
});
```

**File**: `tests/integration/fixtures/playwright.config.ts`

```typescript
import { defineConfig } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: path.join(__dirname),
  fullyParallel: false,
  workers: 1,
  reporter: [
    [
      path.join(__dirname, "../../../dist/index.js"),
      {
        grpcAddress: process.env.TEST_GRPC_ADDRESS || "localhost:50051",
        grpcEnabled: true,
        grpcTimeout: 1000,
        verbose: false,
      },
    ],
  ],
  use: {
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
```

### Step 3: Create Integration Tests

**File**: `tests/integration/reporter.integration.test.ts`

```typescript
import { test as base, expect } from "@jest/globals";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { MockGrpcServer } from "./setup";

const execAsync = promisify(exec);

describe("StanterpriseReporter Integration Tests", () => {
  let mockServer: MockGrpcServer;
  const testPort = 50052; // Use different port for tests

  beforeAll(async () => {
    mockServer = new MockGrpcServer();
    await mockServer.start(testPort);
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    mockServer.reset();
  });

  test("should report test lifecycle events", async () => {
    const configPath = path.join(__dirname, "fixtures/playwright.config.ts");
    const testFile = path.join(__dirname, "fixtures/sample.spec.ts");

    // Run Playwright tests
    const { stdout, stderr } = await execAsync(
      `TEST_GRPC_ADDRESS=localhost:${testPort} npx playwright test --config=${configPath} ${testFile}`,
      { cwd: path.join(__dirname, "../../..") }
    );

    // Wait a bit for events to be captured
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify events were captured
    expect(mockServer.capturedEvents.length).toBeGreaterThan(0);

    // Verify suite events
    const suiteBeginEvents = mockServer.getEventsByType("SuiteBegin");
    const suiteEndEvents = mockServer.getEventsByType("SuiteEnd");
    expect(suiteBeginEvents.length).toBeGreaterThan(0);
    expect(suiteEndEvents.length).toBeGreaterThan(0);

    // Verify test events
    const testBeginEvents = mockServer.getEventsByType("TestBegin");
    const testEndEvents = mockServer.getEventsByType("TestEnd");
    expect(testBeginEvents.length).toBeGreaterThan(0);
    expect(testEndEvents.length).toBeGreaterThan(0);

    // Verify event sequencing: begin should come before end
    const firstBegin = mockServer.capturedEvents.find((e) =>
      e.method?.includes("TestBegin")
    );
    const firstEnd = mockServer.capturedEvents.find((e) =>
      e.method?.includes("TestEnd")
    );
    expect(firstBegin.timestamp.getTime()).toBeLessThan(
      firstEnd.timestamp.getTime()
    );
  }, 30000);

  test("should report test failures", async () => {
    const configPath = path.join(__dirname, "fixtures/playwright.config.ts");
    const testFile = path.join(__dirname, "fixtures/sample.spec.ts");

    try {
      await execAsync(
        `TEST_GRPC_ADDRESS=localhost:${testPort} npx playwright test --config=${configPath} ${testFile} --grep "failing"`,
        { cwd: path.join(__dirname, "../../..") }
      );
    } catch (e) {
      // Expected to fail
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify failure events
    const failureEvents = mockServer.getEventsByType("TestFailure");
    expect(failureEvents.length).toBeGreaterThan(0);

    // Verify failure event contains error info
    const failureEvent = failureEvents[0];
    expect(failureEvent.data).toBeDefined();
  }, 30000);

  test("should report step events", async () => {
    const configPath = path.join(__dirname, "fixtures/playwright.config.ts");
    const testFile = path.join(__dirname, "fixtures/sample.spec.ts");

    await execAsync(
      `TEST_GRPC_ADDRESS=localhost:${testPort} npx playwright test --config=${configPath} ${testFile} --grep "with steps"`,
      { cwd: path.join(__dirname, "../../..") }
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify step events
    const stepBeginEvents = mockServer.getEventsByType("StepBegin");
    const stepEndEvents = mockServer.getEventsByType("StepEnd");

    expect(stepBeginEvents.length).toBeGreaterThanOrEqual(2);
    expect(stepEndEvents.length).toBeGreaterThanOrEqual(2);
  }, 30000);

  test("should handle gRPC server being unavailable", async () => {
    // Stop the mock server
    await mockServer.stop();

    const configPath = path.join(__dirname, "fixtures/playwright.config.ts");
    const testFile = path.join(__dirname, "fixtures/sample.spec.ts");

    // Run tests - should not crash
    const { stdout, stderr } = await execAsync(
      `TEST_GRPC_ADDRESS=localhost:${testPort} npx playwright test --config=${configPath} ${testFile} --grep "passing"`,
      { cwd: path.join(__dirname, "../../..") }
    );

    // Should have warning about gRPC failure
    expect(stderr).toContain("gRPC disabled");

    // Restart server for other tests
    await mockServer.start(testPort);
  }, 30000);

  test("should include run ID in all events", async () => {
    const configPath = path.join(__dirname, "fixtures/playwright.config.ts");
    const testFile = path.join(__dirname, "fixtures/sample.spec.ts");

    await execAsync(
      `TEST_GRPC_ADDRESS=localhost:${testPort} npx playwright test --config=${configPath} ${testFile} --grep "passing"`,
      { cwd: path.join(__dirname, "../../..") }
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get a test event
    const testEvents = mockServer.getEventsByType("TestBegin");
    expect(testEvents.length).toBeGreaterThan(0);

    // Extract run ID from first event
    const runId = testEvents[0].data?.test_case?.run_id;
    expect(runId).toBeDefined();
    expect(typeof runId).toBe("string");
    expect(runId.length).toBeGreaterThan(0);

    // Verify all events have the same run ID
    mockServer.capturedEvents.forEach((event) => {
      if (event.data?.test_case?.run_id) {
        expect(event.data.test_case.run_id).toBe(runId);
      }
      if (event.data?.step?.run_id) {
        expect(event.data.step.run_id).toBe(runId);
      }
    });
  }, 30000);
});
```

### Step 4: Update Jest Configuration

**File**: `jest.config.js`

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/index.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  // Separate timeout for integration tests
  testTimeout: 30000,
  // Run integration tests separately
  projects: [
    {
      displayName: "unit",
      testMatch: [
        "<rootDir>/tests/**/*.test.ts",
        "!<rootDir>/tests/integration/**",
      ],
      testTimeout: 5000,
    },
    {
      displayName: "integration",
      testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
      testTimeout: 30000,
    },
  ],
};
```

### Step 5: Add NPM Scripts

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

### Step 6: Build Before Integration Tests

Create a pre-test build script:

**File**: `scripts/prepare-integration-tests.sh`

```bash
#!/bin/bash
set -e

echo "Building reporter for integration tests..."
npm run build

echo "Reporter built successfully!"
```

Make executable:

```bash
chmod +x scripts/prepare-integration-tests.sh
```

Update package.json:

```json
{
  "scripts": {
    "pretest:integration": "./scripts/prepare-integration-tests.sh",
    "test:integration": "jest --selectProjects=integration"
  }
}
```

## Testing

### Run Integration Tests

```bash
# Build and run all tests
npm test

# Run only integration tests
npm run test:integration

# Run only unit tests
npm run test:unit

# Watch mode for development
npm run test:watch
```

## Acceptance Criteria

- [ ] Mock gRPC server implemented and functional
- [ ] Test fixtures (sample Playwright tests) created
- [ ] Integration tests verify event lifecycle
- [ ] Integration tests verify event data correctness
- [ ] Integration tests verify error handling
- [ ] Integration tests verify run ID consistency
- [ ] All integration tests pass
- [ ] Integration tests run separately from unit tests
- [ ] Documentation updated with testing info

## Files to Create

- `tests/integration/setup.ts`
- `tests/integration/fixtures/sample.spec.ts`
- `tests/integration/fixtures/playwright.config.ts`
- `tests/integration/reporter.integration.test.ts`
- `scripts/prepare-integration-tests.sh`

## Files to Modify

- `jest.config.js` (add projects configuration)
- `package.json` (add test scripts)
- `README.md` (add testing section)

## Dependencies

- Requires P1-01 (fix console logging) for clean test output
- Should be done before attempting to publish

## Related Tasks

- P1-03: Add Reporter Unit Tests
- P2-03: Performance Optimization (can add perf benchmarks)

---

_Created: December 17, 2025_
