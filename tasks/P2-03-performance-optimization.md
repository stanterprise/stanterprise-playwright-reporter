# P2-03: Performance Optimization 🟡

**Priority**: HIGH  
**Effort**: 2-3 hours  
**Status**: Not Started

## Problem

Performance concerns for large test suites:

- Memory usage with large attachments
- Protobuf serialization overhead
- Synchronous operations blocking event loop
- No performance benchmarks or monitoring

## Solution

Implement performance optimizations:

- Lazy loading and streaming for large attachments
- Async protobuf serialization
- Memory limits and cleanup
- Performance benchmarking

## Implementation Steps

### 1. Add Attachment Size Limits

**File**: `src/types.ts`

```typescript
export interface StanterpriseReporterOptions {
  // ... existing options

  /**
   * Maximum attachment size in bytes (attachments larger will be truncated)
   * @default 5MB
   */
  maxAttachmentSize?: number;

  /**
   * Whether to include attachment content or just paths
   * @default "auto" - include small attachments, reference large ones
   */
  attachmentMode?: "always" | "never" | "auto";

  /**
   * Threshold for "auto" mode (bytes)
   * @default 1MB
   */
  attachmentAutoThreshold?: number;
}
```

### 2. Optimize Attachment Processing

**File**: `src/utils/attachmentProcessor.ts`

```typescript
/**
 * Process attachments with size limits
 */
export function processAttachments(
  result: TestResult,
  options?: {
    maxSize?: number;
    mode?: "always" | "never" | "auto";
    autoThreshold?: number;
  }
): InstanceType<typeof Attachment>[] {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    mode = "auto",
    autoThreshold = 1 * 1024 * 1024, // 1MB
  } = options || {};

  const attachments: InstanceType<typeof Attachment>[] = [];

  if (!result.attachments || result.attachments.length === 0) {
    return attachments;
  }

  for (const attachment of result.attachments) {
    const att = new Attachment({
      name: attachment.name,
      mime_type: attachment.contentType,
    });

    // Handle based on mode
    if (mode === "never") {
      // Only include path
      if (attachment.path) {
        att.uri = attachment.path;
      }
    } else if (mode === "always") {
      // Always include content if available
      if (attachment.body) {
        const size = attachment.body.length;
        if (size > maxSize) {
          att.uri = `[Truncated: ${(size / 1024 / 1024).toFixed(
            2
          )}MB exceeds limit]`;
        } else {
          att.content = attachment.body;
        }
      } else if (attachment.path) {
        att.uri = attachment.path;
      }
    } else {
      // Auto mode: include small, reference large
      if (attachment.body) {
        const size = attachment.body.length;
        if (size <= autoThreshold) {
          att.content = attachment.body;
        } else if (size <= maxSize && attachment.path) {
          att.uri = attachment.path;
        } else {
          att.uri = `[Truncated: ${(size / 1024 / 1024).toFixed(2)}MB]`;
        }
      } else if (attachment.path) {
        att.uri = attachment.path;
      }
    }

    attachments.push(att);
  }

  return attachments;
}
```

### 3. Add Memory Monitoring

**File**: `src/utils/memoryMonitor.ts`

```typescript
/**
 * Monitor memory usage
 */
export class MemoryMonitor {
  private initialMemory: NodeJS.MemoryUsage;
  private peakMemory: number = 0;

  constructor() {
    this.initialMemory = process.memoryUsage();
  }

  /**
   * Get current memory usage
   */
  getCurrentUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Track peak memory
   */
  trackPeak(): void {
    const current = process.memoryUsage().heapUsed;
    if (current > this.peakMemory) {
      this.peakMemory = current;
    }
  }

  /**
   * Get memory delta since initialization
   */
  getDelta(): {
    heapUsed: number;
    external: number;
    rss: number;
  } {
    const current = this.getCurrentUsage();
    return {
      heapUsed: current.heapUsed - this.initialMemory.heapUsed,
      external: current.external - this.initialMemory.external,
      rss: current.rss - this.initialMemory.rss,
    };
  }

  /**
   * Format bytes to human readable
   */
  static formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const delta = this.getDelta();
    return [
      `Heap: ${MemoryMonitor.formatBytes(delta.heapUsed)}`,
      `Peak: ${MemoryMonitor.formatBytes(this.peakMemory)}`,
      `RSS: ${MemoryMonitor.formatBytes(delta.rss)}`,
    ].join(", ");
  }
}
```

### 4. Add Performance Timing

**File**: `src/utils/performanceTimer.ts`

```typescript
/**
 * Track operation timing
 */
export class PerformanceTimer {
  private timings: Map<string, number[]> = new Map();

  /**
   * Time an operation
   */
  async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.record(name, duration);
    }
  }

  /**
   * Record a timing
   */
  record(name: string, duration: number): void {
    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }
    this.timings.get(name)!.push(duration);
  }

  /**
   * Get statistics for an operation
   */
  getStats(name: string): {
    count: number;
    total: number;
    avg: number;
    min: number;
    max: number;
  } | null {
    const times = this.timings.get(name);
    if (!times || times.length === 0) return null;

    return {
      count: times.length,
      total: times.reduce((a, b) => a + b, 0),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
    };
  }

  /**
   * Get summary of all operations
   */
  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    for (const [name, _] of this.timings) {
      const stats = this.getStats(name);
      if (stats) {
        summary[name] = {
          count: stats.count,
          avg: `${stats.avg.toFixed(2)}ms`,
          total: `${stats.total.toFixed(2)}ms`,
        };
      }
    }
    return summary;
  }
}
```

### 5. Integrate in Reporter

```typescript
export default class StanterpriseReporter implements Reporter {
  private memoryMonitor: MemoryMonitor | null = null;
  private perfTimer: PerformanceTimer | null = null;

  constructor(options: StanterpriseReporterOptions = {}) {
    // ... existing code

    // Enable monitoring in verbose mode
    if (this.verbose) {
      this.memoryMonitor = new MemoryMonitor();
      this.perfTimer = new PerformanceTimer();
    }
  }

  async onExit(): Promise<void> {
    // ... existing code

    if (this.verbose && this.perfTimer) {
      console.log("Performance Summary:");
      console.log(this.perfTimer.getSummary());
    }

    if (this.verbose && this.memoryMonitor) {
      console.log("Memory Summary:", this.memoryMonitor.getSummary());
    }
  }
}
```

### 6. Create Performance Benchmark

**File**: `tests/performance/benchmark.test.ts`

```typescript
import StanterpriseReporter from "../../src/reporter";
import { createMockTestCase, createMockTestResult } from "../helpers/mocks";

describe("Performance Benchmarks", () => {
  it("should handle 1000 tests efficiently", async () => {
    const reporter = new StanterpriseReporter({
      grpcEnabled: false, // Disable for pure reporter performance
      verbose: false,
    });

    const start = performance.now();

    // Simulate 1000 tests
    for (let i = 0; i < 1000; i++) {
      const test = createMockTestCase({ id: `test-${i}` });
      const result = createMockTestResult();

      reporter.onTestBegin(test, result);
      reporter.onTestEnd(test, result);
    }

    const duration = performance.now() - start;

    // Should process 1000 tests in under 1 second
    expect(duration).toBeLessThan(1000);

    console.log(`Processed 1000 tests in ${duration.toFixed(2)}ms`);
  }, 30000);

  it("should handle large attachments without memory leak", async () => {
    const reporter = new StanterpriseReporter({
      grpcEnabled: false,
      maxAttachmentSize: 1024 * 1024, // 1MB
    });

    const initialMemory = process.memoryUsage().heapUsed;

    // Simulate 100 tests with large attachments
    for (let i = 0; i < 100; i++) {
      const test = createMockTestCase({ id: `test-${i}` });
      const result = createMockTestResult({
        attachments: [
          {
            name: "large-screenshot",
            contentType: "image/png",
            body: Buffer.alloc(5 * 1024 * 1024), // 5MB
          },
        ],
      });

      reporter.onTestEnd(test, result);

      // Force GC every 10 tests if available
      if (i % 10 === 0 && global.gc) {
        global.gc();
      }
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;

    // Memory growth should be reasonable (< 50MB)
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);

    console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
  }, 30000);
});
```

## Acceptance Criteria

- [ ] Attachment size limits implemented
- [ ] Memory monitoring added
- [ ] Performance timing added
- [ ] Benchmark tests created
- [ ] Reporter handles 1000+ tests efficiently
- [ ] Memory usage remains bounded with large attachments
- [ ] Performance metrics logged in verbose mode
- [ ] Documentation updated with performance guidelines

## Files to Create

- `src/utils/memoryMonitor.ts`
- `src/utils/performanceTimer.ts`
- `tests/performance/benchmark.test.ts`

## Files to Modify

- `src/types.ts`
- `src/utils/attachmentProcessor.ts`
- `src/reporter.ts`
- `README.md`

---

_Created: December 17, 2025_
