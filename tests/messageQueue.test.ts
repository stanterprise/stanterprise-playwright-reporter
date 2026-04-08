/**
 * Tests for the MessageQueue class
 */
import { MessageQueue } from "../src/client/messageQueue";

describe("MessageQueue", () => {
  describe("enqueue", () => {
    it("should execute a single task and resolve its value", async () => {
      const queue = new MessageQueue();
      const result = await queue.enqueue(async () => 42);
      expect(result).toBe(42);
    });

    it("should execute tasks sequentially, not concurrently", async () => {
      const queue = new MessageQueue();
      const order: number[] = [];

      // Second task resolves before first if run concurrently, but the queue
      // must hold it back until the first one finishes.
      const first = queue.enqueue(
        () =>
          new Promise<void>((resolve) =>
            setTimeout(() => {
              order.push(1);
              resolve();
            }, 50),
          ),
      );

      const second = queue.enqueue(async () => {
        order.push(2);
      });

      await Promise.all([first, second]);

      expect(order).toEqual([1, 2]);
    });

    it("should maintain FIFO order for many tasks", async () => {
      const queue = new MessageQueue();
      const order: number[] = [];
      const N = 10;

      const tasks = Array.from({ length: N }, (_, i) =>
        queue.enqueue(async () => {
          order.push(i);
        }),
      );

      await Promise.all(tasks);

      expect(order).toEqual(Array.from({ length: N }, (_, i) => i));
    });

    it("should propagate task errors to the caller without stopping the queue", async () => {
      const queue = new MessageQueue();
      const order: number[] = [];

      const failing = queue.enqueue(async () => {
        order.push(1);
        throw new Error("task failed");
      });

      const succeeding = queue.enqueue(async () => {
        order.push(2);
        return "ok";
      });

      await expect(failing).rejects.toThrow("task failed");
      await expect(succeeding).resolves.toBe("ok");
      expect(order).toEqual([1, 2]);
    });

    it("should continue processing after an error in one task", async () => {
      const queue = new MessageQueue();
      const results: string[] = [];

      // Mix of failing and succeeding tasks
      const promises = [
        queue.enqueue(async () => { results.push("a"); }),
        queue.enqueue(async () => { throw new Error("boom"); }),
        queue.enqueue(async () => { results.push("b"); }),
        queue.enqueue(async () => { throw new Error("bang"); }),
        queue.enqueue(async () => { results.push("c"); }),
      ];

      const settled = await Promise.allSettled(promises);

      expect(results).toEqual(["a", "b", "c"]);
      expect(settled[0].status).toBe("fulfilled");
      expect(settled[1].status).toBe("rejected");
      expect(settled[2].status).toBe("fulfilled");
      expect(settled[3].status).toBe("rejected");
      expect(settled[4].status).toBe("fulfilled");
    });
  });

  describe("drain", () => {
    it("should resolve immediately when the queue is empty", async () => {
      const queue = new MessageQueue();
      await expect(queue.drain()).resolves.toBeUndefined();
    });

    it("should resolve only after all enqueued tasks complete", async () => {
      const queue = new MessageQueue();
      const completed: number[] = [];

      queue.enqueue(
        () =>
          new Promise<void>((resolve) =>
            setTimeout(() => {
              completed.push(1);
              resolve();
            }, 20),
          ),
      );
      queue.enqueue(async () => {
        completed.push(2);
      });

      await queue.drain();

      expect(completed).toEqual([1, 2]);
    });

    it("should resolve after tasks added while draining are also complete", async () => {
      const queue = new MessageQueue();
      const completed: number[] = [];

      queue.enqueue(async () => {
        completed.push(1);
        // Enqueue another task while the queue is still running
        queue.enqueue(async () => {
          completed.push(2);
        });
      });

      await queue.drain();

      // Both tasks must be done before drain resolves
      expect(completed).toEqual([1, 2]);
    });

    it("multiple concurrent drain() calls should all resolve when done", async () => {
      const queue = new MessageQueue();
      const completed: number[] = [];

      queue.enqueue(
        () =>
          new Promise<void>((resolve) =>
            setTimeout(() => {
              completed.push(1);
              resolve();
            }, 20),
          ),
      );

      // Two independent drain watchers
      const [d1, d2] = [queue.drain(), queue.drain()];
      await Promise.all([d1, d2]);

      expect(completed).toEqual([1]);
    });

    it("should resolve immediately when called after the queue has already drained", async () => {
      const queue = new MessageQueue();

      await queue.enqueue(async () => {});
      // Queue is now idle; drain should resolve immediately
      await expect(queue.drain()).resolves.toBeUndefined();
    });
  });

  describe("concurrency guard", () => {
    it("should never run two tasks at the same time", async () => {
      const queue = new MessageQueue();
      let running = 0;
      let maxConcurrent = 0;

      const tasks = Array.from({ length: 5 }, () =>
        queue.enqueue(
          () =>
            new Promise<void>((resolve) => {
              running++;
              maxConcurrent = Math.max(maxConcurrent, running);
              setTimeout(() => {
                running--;
                resolve();
              }, 10);
            }),
        ),
      );

      await Promise.all(tasks);

      expect(maxConcurrent).toBe(1);
    });
  });
});
