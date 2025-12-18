# P2-02: Add Request Batching 🟡

**Priority**: HIGH  
**Effort**: 3-4 hours  
**Status**: Not Started

## Problem

Currently, each test event triggers an immediate fire-and-forget gRPC call. For large test suites (100+ tests), this creates:

- High network overhead (one connection per event)
- Potential server overload from burst traffic
- Wasted resources on connection setup/teardown
- Possible rate limiting issues

Example: 100 tests with 5 steps each = ~1,200 individual gRPC calls

## Solution

Implement event batching to:

- Buffer events in memory for short period (e.g., 100ms)
- Send multiple events in single gRPC call
- Flush buffer on size threshold or time interval
- Maintain ordering guarantees

## Implementation Steps

### Step 1: Create Event Buffer

**File**: `src/utils/eventBuffer.ts`

```typescript
import { EventEmitter } from "events";

export interface BufferedEvent {
  type: string;
  path: string;
  message: any;
  timestamp: Date;
}

export interface EventBufferOptions {
  maxSize: number;
  flushIntervalMs: number;
  onFlush: (events: BufferedEvent[]) => Promise<void>;
}

export class EventBuffer extends EventEmitter {
  private buffer: BufferedEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private options: EventBufferOptions;
  private isFlushing: boolean = false;

  constructor(options: EventBufferOptions) {
    super();
    this.options = options;
    this.startFlushTimer();
  }

  /**
   * Add event to buffer
   */
  add(event: BufferedEvent): void {
    this.buffer.push(event);

    // Flush if buffer full
    if (this.buffer.length >= this.options.maxSize) {
      this.flush();
    }
  }

  /**
   * Flush buffer immediately
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    const events = this.buffer.splice(0);

    try {
      await this.options.onFlush(events);
      this.emit("flushed", events.length);
    } catch (error) {
      this.emit("error", error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.options.flushIntervalMs);
  }

  /**
   * Stop buffer and flush remaining events
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.buffer.length;
  }
}
```

### Step 2: Add Batching Configuration

**File**: `src/types.ts`

```typescript
export interface StanterpriseReporterOptions {
  // ... existing options

  /**
   * Enable event batching to reduce network overhead
   * @default true
   */
  enableBatching?: boolean;

  /**
   * Maximum number of events to batch before flushing
   * @default 50
   */
  batchSize?: number;

  /**
   * Maximum time to wait before flushing batch (ms)
   * @default 100
   */
  batchFlushIntervalMs?: number;
}
```

### Step 3: Integrate Buffer in Reporter

**File**: `src/reporter.ts`

```typescript
import { EventBuffer, BufferedEvent } from "./utils/eventBuffer";

export default class StanterpriseReporter implements Reporter {
  // ... existing properties

  private eventBuffer: EventBuffer | null = null;
  private enableBatching: boolean;
  private batchSize: number;
  private batchFlushIntervalMs: number;

  constructor(options: StanterpriseReporterOptions = {}) {
    // ... existing initialization

    this.enableBatching = options.enableBatching ?? true;
    this.batchSize = options.batchSize ?? 50;
    this.batchFlushIntervalMs = options.batchFlushIntervalMs ?? 100;

    // Initialize event buffer if batching enabled
    if (this.enableBatching) {
      this.eventBuffer = new EventBuffer({
        maxSize: this.batchSize,
        flushIntervalMs: this.batchFlushIntervalMs,
        onFlush: this.handleBatchFlush.bind(this),
      });

      this.eventBuffer.on("error", (error) => {
        if (this.verbose) {
          console.error("Event buffer error:", error);
        }
      });
    }
  }

  /**
   * Handle batch flush
   */
  private async handleBatchFlush(events: BufferedEvent[]): Promise<void> {
    if (!this.grpcEnabled || !this.grpcClient) {
      return;
    }

    if (this.verbose) {
      console.log(`Flushing batch of ${events.length} events`);
    }

    // Send all events in parallel (they're already buffered)
    const promises = events.map((event) =>
      this.reportUnaryWithRetry(
        event.path,
        event.message,
        this.grpcTimeout
      ).catch((e) => {
        if (this.verbose) {
          console.error(`Failed to send batched event ${event.type}:`, e);
        }
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Queue event for batching or send immediately
   */
  private queueOrSendEvent(
    path: string,
    message: any,
    eventType: string
  ): void {
    if (this.enableBatching && this.eventBuffer) {
      this.eventBuffer.add({
        type: eventType,
        path,
        message,
        timestamp: new Date(),
      });
    } else {
      // Send immediately (fire-and-forget)
      this.reportUnaryWithRetry(path, message, this.grpcTimeout).catch((e) => {
        if (this.verbose) {
          console.error(`Failed to send event ${eventType}:`, e);
        }
      });
    }
  }

  async onExit(): Promise<void> {
    // Flush any remaining buffered events
    if (this.eventBuffer) {
      if (this.verbose) {
        console.log("Flushing remaining buffered events...");
      }
      await this.eventBuffer.stop();
    }

    console.log(
      `Stanterprise Reporter: Test run completed - Run ID: ${this.runId}`
    );

    // ... rest of cleanup
  }
}
```

### Step 4: Update All Event Sending

Replace direct gRPC calls with queued calls:

```typescript
// BEFORE:
this.reportUnaryWithRetry(
  "/testsystem.v1.observer.TestEventCollector/ReportTestBegin",
  request,
  this.grpcTimeout
).catch((e) => this.logGrpcErrorOnce("Failed to report test begin", e));

// AFTER:
this.queueOrSendEvent(
  "/testsystem.v1.observer.TestEventCollector/ReportTestBegin",
  request,
  "TestBegin"
);
```

### Step 5: Add Batch Statistics

```typescript
// In reporter class:
private batchesProcessed: number = 0;
private eventsBuffered: number = 0;

// In handleBatchFlush:
this.batchesProcessed++;
this.eventsBuffered += events.length;

// In onExit:
if (this.verbose && this.enableBatching) {
  console.log('Batching Statistics:', {
    batchesProcessed: this.batchesProcessed,
    eventsBuffered: this.eventsBuffered,
    avgBatchSize: this.batchesProcessed > 0
      ? (this.eventsBuffered / this.batchesProcessed).toFixed(2)
      : 0,
  });
}
```

## Testing

Create tests in `tests/eventBuffer.test.ts`:

```typescript
describe("EventBuffer", () => {
  it("should flush when size threshold reached", async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const buffer = new EventBuffer({
      maxSize: 3,
      flushIntervalMs: 1000,
      onFlush,
    });

    buffer.add({
      type: "test",
      path: "/test",
      message: {},
      timestamp: new Date(),
    });
    buffer.add({
      type: "test",
      path: "/test",
      message: {},
      timestamp: new Date(),
    });
    buffer.add({
      type: "test",
      path: "/test",
      message: {},
      timestamp: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ type: "test" })])
    );

    await buffer.stop();
  });

  it("should flush on interval", async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const buffer = new EventBuffer({
      maxSize: 100,
      flushIntervalMs: 100,
      onFlush,
    });

    buffer.add({
      type: "test",
      path: "/test",
      message: {},
      timestamp: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(onFlush).toHaveBeenCalled();

    await buffer.stop();
  });
});
```

## Acceptance Criteria

- [ ] Event buffer implemented
- [ ] Batching configuration added
- [ ] All event sends use batching
- [ ] Buffer flushes on size threshold
- [ ] Buffer flushes on time interval
- [ ] Buffer flushes on exit
- [ ] Batch statistics tracked
- [ ] Unit tests for event buffer
- [ ] Integration tests verify batching
- [ ] Documentation updated

## Files to Create

- `src/utils/eventBuffer.ts`
- `tests/eventBuffer.test.ts`

## Files to Modify

- `src/types.ts`
- `src/reporter.ts`
- `src/utils/index.ts`
- `README.md`

---

_Created: December 17, 2025_
