# P4-01: Event Filtering ⚪

**Priority**: LOW  
**Effort**: 2-3 hours  
**Status**: Not Started

## Problem

All events are reported without filtering options. Users may want to:

- Skip certain test suites
- Only report failures
- Exclude specific tags
- Filter by test path patterns

## Solution

Add filtering configuration to selectively report events.

## Implementation Outline

```typescript
export interface StanterpriseReporterOptions {
  // ... existing options

  /**
   * Filter configuration
   */
  filters?: {
    /**
     * Only report tests with these tags
     */
    includeTags?: string[];

    /**
     * Skip tests with these tags
     */
    excludeTags?: string[];

    /**
     * Only report tests matching these patterns
     */
    includeTests?: RegExp[];

    /**
     * Skip tests matching these patterns
     */
    excludeTests?: RegExp[];

    /**
     * Only report these event types
     */
    eventTypes?: Array<"test" | "step" | "suite" | "failure">;

    /**
     * Only report tests with these statuses
     */
    statuses?: Array<"passed" | "failed" | "skipped" | "timedOut">;
  };
}

class StanterpriseReporter {
  private shouldReportTest(test: TestCase): boolean {
    // Check tag filters
    if (this.filters?.includeTags) {
      if (!test.tags.some((tag) => this.filters!.includeTags!.includes(tag))) {
        return false;
      }
    }

    if (this.filters?.excludeTags) {
      if (test.tags.some((tag) => this.filters!.excludeTags!.includes(tag))) {
        return false;
      }
    }

    // Check test pattern filters
    // ... similar logic

    return true;
  }

  private shouldReportStatus(status: string): boolean {
    if (!this.filters?.statuses) return true;
    return this.filters.statuses.includes(status as any);
  }
}
```

## Use Cases

```typescript
// Only report failures
reporter: [
  [
    "stanterprise-playwright-reporter",
    {
      filters: { statuses: ["failed"] },
    },
  ],
];

// Skip @smoke tests
reporter: [
  [
    "stanterprise-playwright-reporter",
    {
      filters: { excludeTags: ["@smoke"] },
    },
  ],
];

// Only report specific suite
reporter: [
  [
    "stanterprise-playwright-reporter",
    {
      filters: { includeTests: [/^integration\//] },
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
