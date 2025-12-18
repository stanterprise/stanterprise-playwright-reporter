# P4-06: Usage Telemetry ⚪

**Priority**: LOW  
**Effort**: 3-4 hours  
**Status**: Not Started

## Problem

No insight into how the reporter is being used:

- Which features are most used?
- Common configurations?
- Performance in real-world scenarios?
- Error patterns?

## Solution

Add optional, anonymous usage telemetry.

## Implementation

```typescript
export interface StanterpriseReporterOptions {
  // ... existing options

  /**
   * Enable anonymous usage telemetry
   * Helps improve the reporter
   * @default false
   */
  enableTelemetry?: boolean;

  /**
   * Telemetry endpoint
   * @default "https://telemetry.stanterprise.com/api/v1/events"
   */
  telemetryEndpoint?: string;
}

interface TelemetryEvent {
  reporterVersion: string;
  nodeVersion: string;
  playwrightVersion: string;
  testCount: number;
  duration: number;
  features: {
    batching: boolean;
    retries: boolean;
    sampling: boolean;
    compression: boolean;
  };
  errors: Array<{
    type: string;
    count: number;
  }>;
  // NO personal/sensitive data
  // NO test names, URLs, or content
  // NO user identifiers
}

class TelemetryCollector {
  async send(event: TelemetryEvent): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      // Silently fail - telemetry should never break tests
    }
  }
}
```

## Privacy Considerations

**MUST NOT collect:**

- Test names or content
- URLs or domains
- User identifiers
- Company/org names
- Any PII

**CAN collect:**

- Aggregate counts (tests run, events sent)
- Feature usage flags
- Error types (not messages)
- Performance metrics
- Reporter/Node/Playwright versions

## User Control

- **Opt-in only** (default: disabled)
- Clear documentation of what's collected
- Easy to disable
- Respect Do Not Track

## Files to Create

- `src/utils/telemetry.ts`
- `PRIVACY.md` (explain telemetry)

## Files to Modify

- `src/types.ts`
- `src/reporter.ts`
- `README.md`

---

_Created: December 17, 2025_
