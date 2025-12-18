# P4-02: Event Sampling ⚪

**Priority**: LOW  
**Effort**: 1-2 hours  
**Status**: Not Started

## Problem

For extremely large test suites (1000+ tests), reporting every single event may be excessive:

- High network/storage costs
- Server load concerns
- Most value in aggregates, not individual events

## Solution

Add sampling configuration to report a percentage of events.

## Implementation

```typescript
export interface StanterpriseReporterOptions {
  // ... existing options

  /**
   * Sampling configuration
   */
  sampling?: {
    /**
     * Sample rate (0.0 to 1.0)
     * 1.0 = report all, 0.5 = report 50%, 0.1 = report 10%
     * @default 1.0
     */
    rate?: number;

    /**
     * Always report these event types regardless of sampling
     */
    alwaysReport?: Array<"failure" | "suite" | "test" | "step">;

    /**
     * Use deterministic sampling based on test ID
     * (ensures same tests always sampled across runs)
     */
    deterministic?: boolean;

    /**
     * Random seed for deterministic sampling
     */
    seed?: number;
  };
}

class StanterpriseReporter {
  private shouldSample(eventType: string, identifier?: string): boolean {
    // Always sample if no config or rate is 1.0
    if (!this.sampling || this.sampling.rate === 1.0) {
      return true;
    }

    // Always report certain event types
    if (this.sampling.alwaysReport?.includes(eventType as any)) {
      return true;
    }

    // Deterministic sampling
    if (this.sampling.deterministic && identifier) {
      const hash = this.hashString(identifier, this.sampling.seed);
      return hash % 100 < this.sampling.rate * 100;
    }

    // Random sampling
    return Math.random() < this.sampling.rate;
  }

  private hashString(str: string, seed: number = 0): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
```

## Use Case

```typescript
// Report 10% of events, but always report failures
reporter: [
  [
    "stanterprise-playwright-reporter",
    {
      sampling: {
        rate: 0.1,
        alwaysReport: ["failure"],
        deterministic: true,
      },
    },
  ],
];
```

## Files to Modify

- `src/types.ts`
- `src/reporter.ts`
- `README.md`

---

_Created: December 17, 2025_
