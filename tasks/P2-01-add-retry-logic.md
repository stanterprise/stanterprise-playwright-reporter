# P2-01: Add gRPC Retry Logic 🟡

**Priority**: HIGH  
**Effort**: 2-3 hours  
**Status**: ⚠️ NOT STARTED - ENHANCEMENT NEEDED

> **Note**: Current implementation uses fire-and-forget gRPC calls with single-attempt error handling. Retry logic with exponential backoff would improve reliability for transient failures.

## Problem

Currently, gRPC calls fail immediately on network errors with no retry attempts. This means:

- Transient network issues cause event loss
- Server restarts during test runs lose events
- The "fail once and disable" pattern is too aggressive
- No distinction between temporary vs permanent failures

Real-world scenarios that should be handled:

- Server momentarily unavailable (should retry)
- Network hiccup (should retry)
- Timeout due to server load (should retry)
- Server genuinely down (should fail fast)

## Solution

Implement exponential backoff retry logic with:

- Configurable max retries
- Exponential backoff delays
- Distinction between retryable and non-retryable errors
- Circuit breaker pattern to fail fast after threshold

## Implementation Steps

### Step 1: Add Retry Configuration Options

**File**: `src/types.ts`

```typescript
export interface StanterpriseReporterOptions {
  /**
   * gRPC server address
   * @default "localhost:50051" or process.env.STANTERPRISE_GRPC_ADDRESS
   */
  grpcAddress?: string;

  /**
   * Whether gRPC reporting is enabled
   * @default true or process.env.STANTERPRISE_GRPC_ENABLED !== "false"
   */
  grpcEnabled?: boolean;

  /**
   * Timeout for gRPC calls in milliseconds
   * @default 1000
   */
  grpcTimeout?: number;

  /**
   * Whether to include verbose logging
   * @default false
   */
  verbose?: boolean;

  /**
   * Maximum number of retry attempts for failed gRPC calls
   * @default 3
   */
  grpcMaxRetries?: number;

  /**
   * Initial delay for exponential backoff in milliseconds
   * @default 100
   */
  grpcRetryDelayMs?: number;

  /**
   * Multiplier for exponential backoff
   * @default 2
   */
  grpcRetryBackoffMultiplier?: number;

  /**
   * Number of consecutive failures before disabling gRPC (circuit breaker)
   * @default 5
   */
  grpcCircuitBreakerThreshold?: number;
}
```

### Step 2: Add Retry State Tracking

**File**: `src/reporter.ts`

```typescript
export default class StanterpriseReporter implements Reporter {
  // ... existing properties

  // Retry configuration
  private grpcMaxRetries: number;
  private grpcRetryDelayMs: number;
  private grpcRetryBackoffMultiplier: number;
  private grpcCircuitBreakerThreshold: number;

  // Retry state
  private consecutiveFailures: number = 0;
  private totalRetries: number = 0;
  private successfulCalls: number = 0;

  constructor(options: StanterpriseReporterOptions = {}) {
    // ... existing initialization

    this.grpcMaxRetries = options.grpcMaxRetries ?? 3;
    this.grpcRetryDelayMs = options.grpcRetryDelayMs ?? 100;
    this.grpcRetryBackoffMultiplier = options.grpcRetryBackoffMultiplier ?? 2;
    this.grpcCircuitBreakerThreshold = options.grpcCircuitBreakerThreshold ?? 5;

    if (this.verbose) {
      console.log("Stanterprise Reporter: Retry configuration:", {
        maxRetries: this.grpcMaxRetries,
        initialDelay: this.grpcRetryDelayMs,
        backoffMultiplier: this.grpcRetryBackoffMultiplier,
        circuitBreakerThreshold: this.grpcCircuitBreakerThreshold,
      });
    }
  }
}
```

### Step 3: Implement Retry Helper

**File**: `src/utils/retryHelper.ts`

```typescript
/**
 * Sleep for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Retryable gRPC status codes and error patterns
  const retryablePatterns = [
    "unavailable",
    "deadline exceeded",
    "timeout",
    "econnrefused",
    "enotfound",
    "etimedout",
    "network error",
    "connection refused",
    "connection reset",
  ];

  return retryablePatterns.some((pattern) => message.includes(pattern));
}

/**
 * Calculate delay for exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  multiplier: number
): number {
  // Exponential backoff: baseDelay * (multiplier ^ attempt)
  // Add jitter to prevent thundering herd
  const exponentialDelay = baseDelayMs * Math.pow(multiplier, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // +/- 15% jitter
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Execute function with retry logic
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    baseDelayMs: number;
    multiplier: number;
    onRetry?: (attempt: number, error: Error) => void;
    shouldRetry?: (error: Error) => boolean;
  }
): Promise<T> {
  const {
    maxRetries,
    baseDelayMs,
    multiplier,
    onRetry,
    shouldRetry = isRetryableError,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error as Error;

      // Don't retry if we've exhausted attempts or error is not retryable
      if (attempt >= maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }

      // Calculate delay for this attempt
      const delay = calculateBackoffDelay(attempt, baseDelayMs, multiplier);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError!;
}
```

### Step 4: Update Reporter to Use Retry Logic

**File**: `src/reporter.ts`

```typescript
import { retryWithBackoff, isRetryableError } from "./utils/retryHelper";

export default class StanterpriseReporter implements Reporter {
  // ... existing code

  /**
   * Helper: generic unary call with retry logic
   */
  private async reportUnaryWithRetry(
    path: string,
    message: {
      serialize?: (w?: any) => Uint8Array;
      serializeBinary?: () => Uint8Array;
    },
    deadlineMs: number = 1000
  ): Promise<Buffer> {
    // Check circuit breaker
    if (this.consecutiveFailures >= this.grpcCircuitBreakerThreshold) {
      if (this.verbose) {
        console.warn(
          `Circuit breaker open: ${this.consecutiveFailures} consecutive failures. Skipping gRPC call.`
        );
      }
      return Buffer.alloc(0);
    }

    if (!this.grpcEnabled || !this.grpcClient) {
      return Buffer.alloc(0);
    }

    try {
      const result = await retryWithBackoff(
        () => this.reportUnary(path, message, deadlineMs),
        {
          maxRetries: this.grpcMaxRetries,
          baseDelayMs: this.grpcRetryDelayMs,
          multiplier: this.grpcRetryBackoffMultiplier,
          shouldRetry: isRetryableError,
          onRetry: (attempt, error) => {
            this.totalRetries++;
            if (this.verbose) {
              console.warn(
                `Retry attempt ${attempt}/${this.grpcMaxRetries} for ${path}: ${error.message}`
              );
            }
          },
        }
      );

      // Success - reset consecutive failures
      this.consecutiveFailures = 0;
      this.successfulCalls++;

      return result;
    } catch (error) {
      // Track consecutive failures
      this.consecutiveFailures++;

      // Log error if circuit breaker not yet open
      if (this.consecutiveFailures === this.grpcCircuitBreakerThreshold) {
        this.logGrpcErrorOnce(
          `Circuit breaker threshold reached after ${this.consecutiveFailures} failures`,
          error
        );
      } else if (this.consecutiveFailures < this.grpcCircuitBreakerThreshold) {
        if (this.verbose) {
          console.warn(
            `gRPC call failed after ${this.grpcMaxRetries} retries (${this.consecutiveFailures} consecutive failures): ${error}`
          );
        }
      }

      return Buffer.alloc(0);
    }
  }

  // ... existing reportUnary() method stays as-is

  // Update all gRPC calls to use reportUnaryWithRetry instead of reportUnary
}
```

### Step 5: Update All gRPC Call Sites

Replace all instances of `this.reportUnary()` with `this.reportUnaryWithRetry()`:

```typescript
// Example in onTestBegin():
// BEFORE:
this.reportUnary(
  "/testsystem.v1.observer.TestEventCollector/ReportTestBegin",
  request,
  this.grpcTimeout
).catch((e) => this.logGrpcErrorOnce("Failed to report test begin", e));

// AFTER:
this.reportUnaryWithRetry(
  "/testsystem.v1.observer.TestEventCollector/ReportTestBegin",
  request,
  this.grpcTimeout
).catch((e) => {
  // Error already logged by retry logic
  if (this.verbose) {
    console.error("Final failure reporting test begin:", e);
  }
});
```

### Step 6: Add Retry Metrics to onExit()

**File**: `src/reporter.ts` (in `onExit` method)

```typescript
async onExit(): Promise<void> {
  console.log(
    `Stanterprise Reporter: Test run completed - Run ID: ${this.runId}`
  );

  if (this.verbose) {
    console.log('gRPC Statistics:', {
      successfulCalls: this.successfulCalls,
      totalRetries: this.totalRetries,
      consecutiveFailures: this.consecutiveFailures,
      circuitBreakerOpen: this.consecutiveFailures >= this.grpcCircuitBreakerThreshold,
    });
  }

  // Cleanup gRPC client
  try {
    this.grpcClient?.close();
  } catch (e) {
    console.error(
      "Stanterprise Reporter: Error during gRPC client cleanup in onExit:",
      e
    );
  }
}
```

### Step 7: Export Retry Utilities

**File**: `src/utils/index.ts`

```typescript
export * from "./statusMapper";
export * from "./attachmentProcessor";
export * from "./timeHelpers";
export * from "./retryHelper";
```

## Testing

### Unit Tests

**File**: `tests/retryHelper.test.ts`

```typescript
import {
  sleep,
  isRetryableError,
  calculateBackoffDelay,
  retryWithBackoff,
} from "../src/utils/retryHelper";

describe("retryHelper", () => {
  describe("sleep", () => {
    it("should sleep for specified duration", async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe("isRetryableError", () => {
    it("should identify retryable errors", () => {
      expect(isRetryableError(new Error("UNAVAILABLE"))).toBe(true);
      expect(isRetryableError(new Error("Connection refused"))).toBe(true);
      expect(isRetryableError(new Error("ETIMEDOUT"))).toBe(true);
      expect(isRetryableError(new Error("deadline exceeded"))).toBe(true);
    });

    it("should identify non-retryable errors", () => {
      expect(isRetryableError(new Error("PERMISSION_DENIED"))).toBe(false);
      expect(isRetryableError(new Error("INVALID_ARGUMENT"))).toBe(false);
    });
  });

  describe("calculateBackoffDelay", () => {
    it("should calculate exponential backoff", () => {
      const delay0 = calculateBackoffDelay(0, 100, 2);
      const delay1 = calculateBackoffDelay(1, 100, 2);
      const delay2 = calculateBackoffDelay(2, 100, 2);

      // With jitter, delays should be approximately: 100, 200, 400
      expect(delay0).toBeGreaterThanOrEqual(85);
      expect(delay0).toBeLessThanOrEqual(115);

      expect(delay1).toBeGreaterThanOrEqual(170);
      expect(delay1).toBeLessThanOrEqual(230);

      expect(delay2).toBeGreaterThanOrEqual(340);
      expect(delay2).toBeLessThanOrEqual(460);
    });
  });

  describe("retryWithBackoff", () => {
    it("should succeed on first attempt", async () => {
      const fn = jest.fn().mockResolvedValue("success");
      const result = await retryWithBackoff(fn, {
        maxRetries: 3,
        baseDelayMs: 100,
        multiplier: 2,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable errors", async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error("UNAVAILABLE"))
        .mockRejectedValueOnce(new Error("UNAVAILABLE"))
        .mockResolvedValue("success");

      const result = await retryWithBackoff(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        multiplier: 2,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should not retry non-retryable errors", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("PERMISSION_DENIED"));

      await expect(
        retryWithBackoff(fn, {
          maxRetries: 3,
          baseDelayMs: 10,
          multiplier: 2,
        })
      ).rejects.toThrow("PERMISSION_DENIED");

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should call onRetry callback", async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error("UNAVAILABLE"))
        .mockResolvedValue("success");

      const onRetry = jest.fn();

      await retryWithBackoff(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        multiplier: 2,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it("should throw after max retries", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("UNAVAILABLE"));

      await expect(
        retryWithBackoff(fn, {
          maxRetries: 2,
          baseDelayMs: 10,
          multiplier: 2,
        })
      ).rejects.toThrow("UNAVAILABLE");

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });
});
```

### Integration Test

Add test to verify retry behavior:

```typescript
test("should retry on transient failures", async () => {
  let callCount = 0;

  // Mock server that fails first 2 times
  mockGrpcClient.makeUnaryRequest = jest.fn(
    (path, serialize, deserialize, message, metadata, options, callback) => {
      callCount++;
      if (callCount <= 2) {
        callback(new Error("UNAVAILABLE"), null as any);
      } else {
        callback(null, Buffer.alloc(0));
      }
    }
  ) as any;

  const test = createMockTestCase();
  const result = createMockTestResult();

  reporter.onTestBegin(test, result);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Should have retried and eventually succeeded
  expect(callCount).toBe(3);
  expect(reporter["consecutiveFailures"]).toBe(0);
}, 30000);
```

## Acceptance Criteria

- [ ] Retry configuration options added
- [ ] Exponential backoff implemented
- [ ] Circuit breaker pattern implemented
- [ ] Retry helper utilities created and tested
- [ ] All gRPC calls use retry logic
- [ ] Retryable vs non-retryable errors distinguished
- [ ] Retry statistics tracked and logged
- [ ] Unit tests for retry logic (>90% coverage)
- [ ] Integration tests verify retry behavior
- [ ] Documentation updated with retry configuration

## Files to Create

- `src/utils/retryHelper.ts`
- `tests/retryHelper.test.ts`

## Files to Modify

- `src/types.ts` (add retry options)
- `src/reporter.ts` (add retry logic, update all gRPC calls)
- `src/utils/index.ts` (export retry utilities)
- `README.md` (document retry configuration)

## Dependencies

- Requires P1-03 (unit tests) for proper testing
- Complements P2-03 (performance optimization)

## Related Tasks

- P3-01: Add Metrics (retry stats are metrics)
- P3-03: Add Health Check (can use retry logic)
- P2-04: Fix Type Safety (proper error typing)

---

_Created: December 17, 2025_
