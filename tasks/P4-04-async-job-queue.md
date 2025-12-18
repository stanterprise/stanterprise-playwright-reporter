# P4-04: Async Job Queue ⚪

**Priority**: LOW  
**Effort**: 4-5 hours  
**Status**: Not Started

## Problem

Current fire-and-forget approach means:

- Events lost if process crashes
- No guarantee of delivery
- Can't retry across restarts
- No persistence

## Solution

Implement persistent job queue with disk-backed storage.

## Implementation Outline

```typescript
import { Queue } from "better-queue";
import fs from "fs/promises";

interface QueuedJob {
  id: string;
  type: string;
  path: string;
  message: any;
  timestamp: Date;
  attempts: number;
}

class PersistentEventQueue {
  private queue: Queue;
  private storePath: string;

  constructor(options: {
    storePath: string;
    maxRetries: number;
    concurrency: number;
  }) {
    this.storePath = options.storePath;

    this.queue = new Queue(this.processJob.bind(this), {
      concurrent: options.concurrency,
      maxRetries: options.maxRetries,
      store: {
        // Persist to disk
        type: "fs",
        path: this.storePath,
      },
    });
  }

  async enqueue(job: Omit<QueuedJob, "id" | "attempts">): Promise<void> {
    await this.queue.push({
      ...job,
      id: randomUUID(),
      attempts: 0,
    });
  }

  private async processJob(job: QueuedJob): Promise<void> {
    // Send gRPC request
    // Throw if fails (queue will retry)
  }

  async drain(): Promise<void> {
    await this.queue.close();
  }
}
```

## Benefits

- Guaranteed delivery (eventually)
- Survives process crashes
- Automatic retry with backoff
- Ordered processing

## Considerations

- Disk I/O overhead
- Storage space for queue
- Cleanup of old jobs
- May not be needed for most use cases

## Files to Create

- `src/utils/eventQueue.ts`
- `tests/eventQueue.test.ts`

## Dependencies

- Requires external queue library (e.g., `better-queue`)

---

_Created: December 17, 2025_
