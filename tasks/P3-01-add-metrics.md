# P3-01: Add Metrics Collection 🟢

**Priority**: MEDIUM  
**Effort**: 2-3 hours  
**Status**: Not Started

## Problem

No visibility into reporter operational metrics:

- Number of events sent/failed
- gRPC call success rate
- Event processing times
- Memory/performance patterns
- Batch efficiency

## Solution

Implement comprehensive metrics collection system.

## Key Metrics to Track

### Event Metrics

- Total tests reported
- Total steps reported
- Total attachments processed
- Events by status (passed/failed/skipped)

### gRPC Metrics

- Successful calls
- Failed calls
- Retry attempts
- Average call duration
- Circuit breaker trips

### Performance Metrics

- Total processing time
- Average event processing time
- Memory usage delta
- Peak memory usage

### Batch Metrics (if batching enabled)

- Batches sent
- Average batch size
- Time in buffer

## Implementation Outline

**File**: `src/utils/metrics.ts`

```typescript
export class ReporterMetrics {
  // Event counters
  private testCount = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    timedOut: 0,
  };

  private stepCount = { total: 0, passed: 0, failed: 0 };
  private attachmentCount = { total: 0, totalSize: 0 };

  // gRPC metrics
  private grpcCalls = {
    successful: 0,
    failed: 0,
    retries: 0,
    totalDuration: 0,
  };

  // Timing
  private startTime: Date;
  private eventTimings: number[] = [];

  // Methods: incrementTest(), incrementStep(), recordGrpcCall(), etc.

  getSummary(): MetricsSummary {
    /* ... */
  }
}
```

Integrate in reporter and log summary in `onExit()`.

## Files to Create/Modify

- Create: `src/utils/metrics.ts`, `tests/metrics.test.ts`
- Modify: `src/reporter.ts`, `README.md`

---

_Created: December 17, 2025_
