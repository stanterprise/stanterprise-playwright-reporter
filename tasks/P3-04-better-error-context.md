# P3-04: Better Error Context 🟢

**Priority**: MEDIUM  
**Effort**: 1-2 hours  
**Status**: ⚠️ NOT STARTED - FUTURE ENHANCEMENT

> **Note**: Current error handling includes basic context. Enhanced structured logging with correlation IDs would improve debuggability in production.

## Problem

Error messages lack context:

- Can't tell which test/suite error occurred in
- No request ID or correlation info
- Hard to debug issues from logs

## Solution

Add contextual information to all error logs.

## Implementation

```typescript
interface ErrorContext {
  runId?: string;
  testId?: string;
  suiteId?: string;
  stepId?: string;
  eventType?: string;
  timestamp?: Date;
}

class StanterpriseReporter {
  private logErrorWithContext(
    message: string,
    error: unknown,
    context: ErrorContext
  ): void {
    const contextStr = [
      context.runId && `runId=${context.runId}`,
      context.testId && `testId=${context.testId}`,
      context.suiteId && `suiteId=${context.suiteId}`,
      context.eventType && `event=${context.eventType}`,
    ]
      .filter(Boolean)
      .join(", ");

    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error(
      `[${new Date().toISOString()}] ${message}`,
      contextStr ? `[${contextStr}]` : "",
      `:`,
      errorMsg
    );

    if (this.verbose && error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
  }

  // Update all error logging calls:
  onTestBegin(test: TestCase, result: TestResult): void {
    // ...
    this.queueOrSendEvent(/* ... */).catch((e) =>
      this.logErrorWithContext("Failed to report test begin", e, {
        runId: this.runId,
        testId: test.id,
        eventType: "TestBegin",
      })
    );
  }
}
```

## Improvements

- Structured logging format
- Correlation IDs across events
- Log levels (error, warn, info, debug)
- Optional JSON log format for parsing

## Files to Modify

- `src/reporter.ts` (add context to all logs)
- `src/utils/errors.ts` (add context to error types)

---

_Created: December 17, 2025_
