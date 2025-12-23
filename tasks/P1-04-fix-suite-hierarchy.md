# P1-04: Fix Suite Hierarchy Reporting 🔴

**Priority**: CRITICAL  
**Effort**: 2-3 hours  
**Status**: ✅ COMPLETE

> **Refactored**: Suite hierarchy tracking has been fully implemented in `src/handlers/onBeginHandler.ts`. The `mapSuites()` and `getAllSuites()` functions recursively process the entire suite tree, correctly mapping parent-child relationships via `parent_suite_id`. All suites (root, describe blocks, file suites, project suites) are now properly reported with their hierarchical relationships intact.

## Problem

Suite reporting is incomplete and only tracks the root suite:

```typescript
// In onEnd() - only root suite reported
if (this.rootSuite) {
  this.reportSuiteEnd(this.rootSuite, result);
}
```

Issues:

- Child suites in hierarchies aren't reported
- `describe` blocks nested within other `describe` blocks are ignored
- Suite parent-child relationships not captured
- `getSuiteId()` stores IDs but child suites never get begin/end events

Example hierarchy that won't be fully tracked:

```typescript
describe("Parent Suite", () => {
  // ❌ Not reported
  describe("Child Suite A", () => {
    // ❌ Not reported
    test("test 1", () => {}); // ✅ Reported
  });
  describe("Child Suite B", () => {
    // ❌ Not reported
    test("test 2", () => {}); // ✅ Reported
  });
});
```

## Solution

Recursively walk the suite tree and report begin/end events for all suites, maintaining parent-child relationships.

## Implementation Steps

### Step 1: Add Suite Tree Walking

**File**: `src/reporter.ts`

Add helper method to recursively process suite tree:

```typescript
/**
 * Recursively report suite begin for a suite and all its children
 */
private reportSuiteTreeBegin(suite: Suite): void {
  // Report this suite's begin
  const suiteId = this.getSuiteId(suite);
  this.reportSuiteBegin(suite, suiteId);

  // Recursively report child suites
  if (suite.suites && suite.suites.length > 0) {
    for (const childSuite of suite.suites) {
      this.reportSuiteTreeBegin(childSuite);
    }
  }
}

/**
 * Recursively report suite end for a suite and all its children (in reverse order)
 */
private reportSuiteTreeEnd(suite: Suite, result: FullResult): void {
  // First, recursively report child suites end (children before parent)
  if (suite.suites && suite.suites.length > 0) {
    for (const childSuite of suite.suites) {
      this.reportSuiteTreeEnd(childSuite, result);
    }
  }

  // Then report this suite's end
  this.reportSuiteEnd(suite, result);
}
```

### Step 2: Update `onBegin()` to Report Full Tree

**File**: `src/reporter.ts` (in `onBegin` method)

```typescript
// BEFORE:
// Report root suite begin and track its ID
const rootSuiteId = this.getSuiteId(suite);

// Report the suite begin event
this.reportSuiteBegin(suite, rootSuiteId);

// AFTER:
// Report root suite and all child suites recursively
this.reportSuiteTreeBegin(suite);
```

### Step 3: Update `onEnd()` to Report Full Tree

**File**: `src/reporter.ts` (in `onEnd` method)

```typescript
// BEFORE:
// Report root suite end
if (this.rootSuite) {
  this.reportSuiteEnd(this.rootSuite, result);
}

// AFTER:
// Report all suites end (from leaves to root)
if (this.rootSuite) {
  this.reportSuiteTreeEnd(this.rootSuite, result);
}
```

### Step 4: Add Parent Suite ID to Suite Events

**File**: `src/reporter.ts` (in `reportSuiteBegin` and `reportSuiteEnd`)

Update the protobuf message to include parent suite ID:

```typescript
// In reportSuiteBegin():
const request = new EventsNS.SuiteBeginEventRequest({
  suite: new TestSuiteEntities.TestSuiteRun({
    id: id,
    name: suite.title || "root",
    start_time: createTimestamp(this.runStartTime),
    metadata: metadata,
    // Add parent suite ID if not root
    parent_suite_id: suite.parent ? this.getSuiteId(suite.parent) : "",
  }),
});

// In reportSuiteEnd():
const request = new EventsNS.SuiteEndEventRequest({
  suite: new TestSuiteEntities.TestSuiteRun({
    id: suiteId,
    name: suite.title || "root",
    start_time: createTimestamp(this.runStartTime),
    end_time: createTimestamp(endTime),
    duration: createDuration(duration),
    status: suiteStatus,
    metadata: metadata,
    // Add parent suite ID if not root
    parent_suite_id: suite.parent ? this.getSuiteId(suite.parent) : "",
  }),
});
```

### Step 5: Improve Suite ID Generation

**File**: `src/reporter.ts` (update `getSuiteId` method)

Make suite IDs more reliable:

```typescript
// BEFORE:
private getSuiteId(suite: Suite): string {
  // Check if we've already reported this suite
  if (this.reportedSuites.has(suite)) {
    return this.reportedSuites.get(suite)!;
  }

  // Generate a unique suite ID based on suite hierarchy
  const titlePath = suite.titlePath().join("/") || "root";
  const suiteId = `${this.runId}-suite-${titlePath}`;

  // Track that we've reported this suite
  this.reportedSuites.set(suite, suiteId);

  return suiteId;
}

// AFTER:
private getSuiteId(suite: Suite): string {
  // Check if we've already generated an ID for this suite
  if (this.reportedSuites.has(suite)) {
    return this.reportedSuites.get(suite)!;
  }

  // Generate a unique suite ID based on full hierarchy path
  // titlePath() returns array like: ['', 'Parent Suite', 'Child Suite']
  const titlePath = suite.titlePath().filter(t => t).join("/") || "root";

  // Sanitize path to be URL-safe
  const sanitizedPath = titlePath.replace(/[^a-zA-Z0-9-_\/]/g, '-');

  const suiteId = `${this.runId}-suite-${sanitizedPath}`;

  // Store the mapping
  this.reportedSuites.set(suite, suiteId);

  return suiteId;
}
```

### Step 6: Track Suite Timing

Add suite-specific timing instead of using global run time:

```typescript
// Add to class properties:
private suiteTimes: Map<Suite, Date> = new Map();

// In reportSuiteTreeBegin():
private reportSuiteTreeBegin(suite: Suite): void {
  // Track suite start time
  const startTime = new Date();
  this.suiteTimes.set(suite, startTime);

  // Report this suite's begin
  const suiteId = this.getSuiteId(suite);
  this.reportSuiteBegin(suite, suiteId, startTime);

  // Recursively report child suites
  if (suite.suites && suite.suites.length > 0) {
    for (const childSuite of suite.suites) {
      this.reportSuiteTreeBegin(childSuite);
    }
  }
}

// Update reportSuiteBegin signature:
private reportSuiteBegin(suite: Suite, suiteId: string, startTime: Date): void {
  // ... use startTime instead of this.runStartTime
}

// In reportSuiteTreeEnd():
private reportSuiteTreeEnd(suite: Suite, result: FullResult): void {
  // First, recursively report child suites end
  if (suite.suites && suite.suites.length > 0) {
    for (const childSuite of suite.suites) {
      this.reportSuiteTreeEnd(childSuite, result);
    }
  }

  // Get suite start time
  const startTime = this.suiteTimes.get(suite) || this.runStartTime;

  // Report this suite's end
  this.reportSuiteEnd(suite, result, startTime);
}

// Update reportSuiteEnd signature:
private reportSuiteEnd(suite: Suite, result: FullResult, startTime: Date): void {
  const suiteId = this.getSuiteId(suite);
  const endTime = new Date();
  const duration = endTime.getTime() - startTime.getTime();

  // ... rest of implementation
}
```

### Step 7: Add Verbose Logging for Suite Hierarchy

```typescript
private reportSuiteTreeBegin(suite: Suite): void {
  if (this.verbose) {
    const depth = suite.titlePath().length - 1;
    const indent = '  '.repeat(depth);
    console.log(`${indent}Suite begin: ${suite.title || 'root'}`);
  }

  // ... rest of implementation
}
```

## Testing

### Manual Test

Create a test file with nested suites:

**File**: `examples/tests/nested-suites.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Level 1 Suite", () => {
  test("test at level 1", () => {
    expect(1).toBe(1);
  });

  test.describe("Level 2 Suite A", () => {
    test("test at level 2a", () => {
      expect(2).toBe(2);
    });

    test.describe("Level 3 Suite", () => {
      test("test at level 3", () => {
        expect(3).toBe(3);
      });
    });
  });

  test.describe("Level 2 Suite B", () => {
    test("test at level 2b", () => {
      expect(4).toBe(4);
    });
  });
});
```

Run with verbose:

```bash
DEBUG=true npx playwright test examples/tests/nested-suites.spec.ts
```

Expected output should show all suite levels being reported.

### Unit Test

Add to `tests/reporter.test.ts`:

```typescript
describe("Suite Hierarchy", () => {
  it("should report all nested suites", async () => {
    const childSuite1 = createMockSuite({ title: "Child 1" });
    const childSuite2 = createMockSuite({ title: "Child 2" });
    const parentSuite = createMockSuite({
      title: "Parent",
      suites: [childSuite1, childSuite2],
    });

    childSuite1.parent = parentSuite;
    childSuite2.parent = parentSuite;

    const config = createMockFullConfig();
    reporter.onBegin(config, parentSuite);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have called gRPC for parent + 2 children = 3 suite begins
    const calls = (mockGrpcClient.makeUnaryRequest as jest.Mock).mock.calls;
    const suiteBeginCalls = calls.filter((call) =>
      call[0].includes("ReportSuiteBegin")
    );
    expect(suiteBeginCalls.length).toBeGreaterThanOrEqual(3);
  });

  it("should include parent suite ID in child suites", async () => {
    const childSuite = createMockSuite({ title: "Child" });
    const parentSuite = createMockSuite({
      title: "Parent",
      suites: [childSuite],
    });
    childSuite.parent = parentSuite;

    const config = createMockFullConfig();
    reporter.onBegin(config, parentSuite);

    // Verify child suite has parent ID
    const parentId = reporter["getSuiteId"](parentSuite);
    const childId = reporter["getSuiteId"](childSuite);

    expect(childId).toContain(parentSuite.title);
    expect(parentId).not.toBe(childId);
  });
});
```

## Acceptance Criteria

- [ ] All suites in hierarchy are reported (begin + end)
- [ ] Suite begin events sent before child suite events
- [ ] Suite end events sent after child suite events (leaves-to-root order)
- [ ] Parent-child relationships captured in suite IDs
- [ ] Each suite has its own start time tracked
- [ ] Suite durations calculated correctly
- [ ] Deeply nested suites (3+ levels) work correctly
- [ ] Unit tests verify suite tree walking
- [ ] Integration tests verify suite event sequencing
- [ ] Verbose logging shows suite hierarchy

## Files to Modify

- `src/reporter.ts` (add tree walking, update onBegin/onEnd)

## Files to Create

- `examples/tests/nested-suites.spec.ts` (for manual testing)

## Dependencies

- Requires P1-03 (unit tests) to verify behavior
- May require protobuf schema updates for parent_suite_id field

## Related Tasks

- P1-02: Integration Tests (should test suite hierarchy)
- P1-03: Reporter Unit Tests (should verify suite tree walking)
- P3-01: Add Metrics (could track suite counts)

---

_Created: December 17, 2025_
