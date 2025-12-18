# P1-01: Fix Console Logging Spam 🔴

**Priority**: CRITICAL  
**Effort**: 1-2 hours  
**Status**: Not Started

## Problem

The reporter currently outputs to console on **EVERY** test and step event, regardless of the `verbose` flag setting. This severely pollutes test output, especially with large test suites.

### Current Behavior

```typescript
// In onTestBegin() - runs ALWAYS:
console.log(`Stanterprise Reporter: Test started - ${test.title}`);
console.log(`  Run ID: ${this.runId}`);
console.log(`  Test ID (static): ${test.id}`);
console.log(`  Unique Execution ID: ${uniqueTestExecutionId}`);

// In onStepBegin() - runs ALWAYS:
console.log(`Stanterprise Reporter: Step started - ${step.title}`);
console.log(`  Category: ${step.category}`);
```

### Impact

- With 100 tests: **~600+ console lines** polluting output
- Makes it impossible to see actual test results
- Professional reporters should be silent by default
- Users can't disable this noise except by removing the reporter
- Violates Playwright reporter best practices

## Solution

Gate ALL debug/informational console output behind `this.verbose` check. Keep only essential logs unconditional.

### What Should Always Log (Unconditional)

1. `onExit()` - Final summary (Run ID, completion message)
2. `onError()` - Critical errors
3. `logGrpcErrorOnce()` - gRPC connection failures (already uses console.warn)

### What Should Be Verbose-Only

1. All test lifecycle logs (`onTestBegin`, `onTestEnd`)
2. All step lifecycle logs (`onStepBegin`, `onStepEnd`)
3. All suite lifecycle logs (`onBegin`, `onEnd`, suite begin/end)
4. Configuration initialization logs
5. Test metadata/status logs
6. Duration and timing logs

## Implementation Steps

### Step 1: Update `onBegin()`

**File**: `src/reporter.ts`

```typescript
// BEFORE:
if (this.verbose) {
  console.log("Stanterprise Reporter: Initialized with options:", {
    grpcAddress: this.grpcAddress,
    grpcEnabled: this.grpcEnabled,
    grpcTimeout: this.grpcTimeout,
    verbose: this.verbose,
  });
}

if (this.grpcEnabled) {
  // ...
} else {
  if (this.verbose) {
    console.log(
      "Stanterprise Reporter: gRPC disabled via STANTERPRISE_GRPC_ENABLED=false"
    );
  }
}

if (this.verbose) {
  console.log(`Stanterprise Reporter: Test run started with ID: ${this.runId}`);
  console.log(`Number of tests: ${suite.allTests().length}`);
  console.log(`Run started at: ${this.runStartTime.toISOString()}`);
}

// AFTER: Already correct! No changes needed.
```

### Step 2: Update `onTestBegin()`

**File**: `src/reporter.ts` (lines ~157-160)

```typescript
// BEFORE:
console.log(`Stanterprise Reporter: Test started - ${test.title}`);
console.log(`  Run ID: ${this.runId}`);
console.log(`  Test ID (static): ${test.id}`);
console.log(`  Unique Execution ID: ${uniqueTestExecutionId}`);

// AFTER:
if (this.verbose) {
  console.log(`Stanterprise Reporter: Test started - ${test.title}`);
  console.log(`  Run ID: ${this.runId}`);
  console.log(`  Test ID (static): ${test.id}`);
  console.log(`  Unique Execution ID: ${uniqueTestExecutionId}`);
}
```

### Step 3: Update `onStepBegin()`

**File**: `src/reporter.ts` (lines ~205-206)

```typescript
// BEFORE:
console.log(`Stanterprise Reporter: Step started - ${step.title}`);
console.log(`  Category: ${step.category}`);

// AFTER:
if (this.verbose) {
  console.log(`Stanterprise Reporter: Step started - ${step.title}`);
  console.log(`  Category: ${step.category}`);
}
```

### Step 4: Update `onStepEnd()`

**File**: `src/reporter.ts` (lines ~257-258)

```typescript
// BEFORE:
console.log(`Stanterprise Reporter: Step ended - ${step.title}`);
console.log(`  Duration: ${step.duration}ms`);

// AFTER:
if (this.verbose) {
  console.log(`Stanterprise Reporter: Step ended - ${step.title}`);
  console.log(`  Duration: ${step.duration}ms`);
}
```

### Step 5: Update `onTestEnd()`

**File**: `src/reporter.ts` (lines ~313-315)

```typescript
// BEFORE:
console.log(`Stanterprise Reporter: Test ended - ${test.title}`);
console.log(`  Status: ${result.status}`);
console.log(`  Duration: ${result.duration}ms`);

// AFTER:
if (this.verbose) {
  console.log(`Stanterprise Reporter: Test ended - ${test.title}`);
  console.log(`  Status: ${result.status}`);
  console.log(`  Duration: ${result.duration}ms`);
}
```

### Step 6: Update `onEnd()`

**File**: `src/reporter.ts` (lines ~135-143)

```typescript
// BEFORE:
console.log(`Stanterprise Reporter: Test run ended - Run ID: ${this.runId}`);
console.log(`Final result: ${result.status}`);
console.log(
  `Run duration: ${runDuration}ms (Playwright duration: ${result.duration}ms)`
);
console.log(`Run start time: ${this.runStartTime.toISOString()}`);
console.log(`Playwright start time: ${result.startTime.toISOString()}`);

// AFTER:
if (this.verbose) {
  console.log(`Stanterprise Reporter: Test run ended - Run ID: ${this.runId}`);
  console.log(`Final result: ${result.status}`);
  console.log(
    `Run duration: ${runDuration}ms (Playwright duration: ${result.duration}ms)`
  );
  console.log(`Run start time: ${this.runStartTime.toISOString()}`);
  console.log(`Playwright start time: ${result.startTime.toISOString()}`);
}
```

### Step 7: Update `reportSuiteBegin()`

**File**: `src/reporter.ts` (lines ~458-461)

```typescript
// BEFORE:
console.log(`Stanterprise Reporter: Suite started - ${suite.title || "root"}`);
console.log(`  Suite type: ${suite.type}`);

// AFTER:
if (this.verbose) {
  console.log(
    `Stanterprise Reporter: Suite started - ${suite.title || "root"}`
  );
  console.log(`  Suite type: ${suite.type}`);
}
```

### Step 8: Update `reportSuiteEnd()`

**File**: `src/reporter.ts` (lines ~493-495)

```typescript
// BEFORE:
console.log(`Stanterprise Reporter: Suite ended - ${suite.title || "root"}`);
console.log(`  Duration: ${duration}ms`);

// AFTER:
if (this.verbose) {
  console.log(`Stanterprise Reporter: Suite ended - ${suite.title || "root"}`);
  console.log(`  Duration: ${duration}ms`);
}
```

### Step 9: Update `onStdErr()`

**File**: `src/reporter.ts` (lines ~420-422)

```typescript
// BEFORE:
console.error(
  `Stanterprise Reporter: Standard error output - ${chunk.toString()}`
);

// AFTER:
if (this.verbose) {
  console.error(
    `Stanterprise Reporter: Standard error output - ${chunk.toString()}`
  );
}
```

### Step 10: Keep `onExit()` Unconditional (Summary Only)

**File**: `src/reporter.ts` (line ~106)

```typescript
// Keep as-is (unconditional, but concise):
console.log(
  `Stanterprise Reporter: Test run completed - Run ID: ${this.runId}`
);
```

## Testing

### Manual Test

1. Run example tests WITHOUT verbose:

   ```bash
   npx playwright test --config=examples/playwright.config.basic.ts
   ```

   **Expected**: Only see "Test run completed" message, no per-test logs

2. Run example tests WITH verbose:

   ```bash
   DEBUG=true npx playwright test --config=examples/playwright.config.advanced.ts
   ```

   **Expected**: See all detailed logs

### Automated Test

Add test in `tests/reporter.test.ts`:

```typescript
describe("Console logging", () => {
  it("should not log when verbose=false", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const reporter = new StanterpriseReporter({ verbose: false });

    // Call methods that used to log unconditionally
    reporter.onTestBegin(mockTest, mockResult);

    // Should not have logged
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should log when verbose=true", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const reporter = new StanterpriseReporter({ verbose: true });

    reporter.onTestBegin(mockTest, mockResult);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
```

## Acceptance Criteria

- [ ] All test/step lifecycle logs gated behind `this.verbose`
- [ ] `onExit()` summary still appears (unconditional)
- [ ] Error logs still appear (unconditional)
- [ ] Manual test with 100+ tests produces clean output
- [ ] Verbose mode still shows all logs when enabled
- [ ] Unit tests verify logging behavior

## Files to Modify

- `src/reporter.ts` (multiple methods)

## Dependencies

None - standalone task

## Related Tasks

- P3-01: Add Metrics (could replace some verbose logs)
- P1-03: Add Reporter Unit Tests (should test this behavior)

---

_Created: December 17, 2025_
