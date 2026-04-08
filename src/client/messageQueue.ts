/**
 * A sequential async message queue that processes enqueued tasks one at a time,
 * guaranteeing that each task completes before the next one begins.
 *
 * This ensures that gRPC messages are delivered to the server in the exact order
 * they were enqueued, regardless of how quickly each individual call completes.
 * It also serializes debug file writes as a side effect, since those are performed
 * inside each task.
 */
export class MessageQueue {
  private tasks: Array<() => Promise<void>> = [];
  private processing = false;
  private drainResolvers: Array<() => void> = [];

  /**
   * Adds a task to the queue and returns a Promise that resolves (or rejects)
   * when the task has been executed. If the queue is idle the task starts
   * immediately; otherwise it waits for all preceding tasks to finish first.
   */
  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.tasks.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });

      if (!this.processing) {
        this.processNext();
      }
    });
  }

  /**
   * Returns a Promise that resolves once the queue has been fully drained
   * (i.e. all currently enqueued tasks have finished). Resolves immediately
   * if the queue is already empty.
   */
  drain(): Promise<void> {
    if (!this.processing && this.tasks.length === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.drainResolvers.push(resolve);
    });
  }

  private async processNext(): Promise<void> {
    this.processing = true;

    while (this.tasks.length > 0) {
      const task = this.tasks.shift()!;
      try {
        await task();
      } catch {
        // Each task's promise already carries the error to its caller.
        // Errors must not stop the queue from processing subsequent tasks.
      }
    }

    this.processing = false;

    const resolvers = this.drainResolvers;
    this.drainResolvers = [];
    resolvers.forEach((r) => r());
  }
}
