# P3-03: Add Health Check 🟢

**Priority**: MEDIUM  
**Effort**: 1-2 hours  
**Status**: Not Started

## Problem

Reporter doesn't verify gRPC server is reachable at startup:

- Tests run even if server is down
- No early warning of connectivity issues
- All events silently fail if server unavailable

## Solution

Add health check on initialization with configurable behavior.

## Implementation

```typescript
export interface StanterpriseReporterOptions {
  // ... existing options

  /**
   * Whether to check gRPC server health at startup
   * @default true
   */
  enableHealthCheck?: boolean;

  /**
   * What to do if health check fails
   * - "warn": Log warning and continue
   * - "disable": Disable gRPC and continue
   * - "fail": Throw error and abort
   * @default "warn"
   */
  healthCheckFailureMode?: "warn" | "disable" | "fail";

  /**
   * Timeout for health check (ms)
   * @default 5000
   */
  healthCheckTimeout?: number;
}

class StanterpriseReporter {
  async onBegin(config: FullConfig, suite: Suite): Promise<void> {
    // ... existing code

    if (this.grpcEnabled && this.enableHealthCheck) {
      const healthy = await this.checkHealth();

      if (!healthy) {
        switch (this.healthCheckFailureMode) {
          case "fail":
            throw new GrpcError("Health check failed");
          case "disable":
            console.warn("Health check failed, disabling gRPC");
            this.grpcEnabled = false;
            break;
          case "warn":
          default:
            console.warn("Health check failed, will retry on first event");
        }
      }
    }
  }

  private async checkHealth(): Promise<boolean> {
    try {
      // Send simple ping or use gRPC health check protocol
      await this.reportUnary(
        "/grpc.health.v1.Health/Check",
        {
          /* empty request */
        },
        this.healthCheckTimeout
      );
      return true;
    } catch (error) {
      if (this.verbose) {
        console.error("Health check failed:", error);
      }
      return false;
    }
  }
}
```

## Testing

Add tests for health check scenarios:

- Server available
- Server unavailable
- Different failure modes

## Files to Modify

- `src/types.ts` (add options)
- `src/reporter.ts` (add health check)
- `tests/reporter.test.ts` (add tests)
- `README.md` (document feature)

---

_Created: December 17, 2025_
