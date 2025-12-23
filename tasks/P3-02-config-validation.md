# P3-02: Configuration Validation 🟢

**Priority**: MEDIUM  
**Effort**: 1-2 hours  
**Status**: ⚠️ NOT STARTED - FUTURE ENHANCEMENT

> **Note**: Basic configuration handling exists via `optionsMapper.ts`. More comprehensive validation with helpful error messages would improve developer experience.

## Problem

No validation of configuration options:

- Invalid timeout values accepted
- Negative retry counts allowed
- Invalid gRPC addresses not detected early
- No helpful error messages for misconfigurations

## Solution

Add comprehensive configuration validation in constructor.

## Validation Rules

```typescript
class StanterpriseReporter {
  constructor(options: StanterpriseReporterOptions = {}) {
    this.validateOptions(options);
    // ... rest of initialization
  }

  private validateOptions(opts: StanterpriseReporterOptions): void {
    // Timeout validation
    if (opts.grpcTimeout !== undefined) {
      if (opts.grpcTimeout < 0) {
        throw new ConfigurationError("grpcTimeout must be >= 0");
      }
      if (opts.grpcTimeout > 30000) {
        console.warn("grpcTimeout > 30s may cause test delays");
      }
    }

    // Retry validation
    if (opts.grpcMaxRetries !== undefined && opts.grpcMaxRetries < 0) {
      throw new ConfigurationError("grpcMaxRetries must be >= 0");
    }

    // Address validation
    if (opts.grpcAddress) {
      const addressPattern = /^[\w.-]+:\d+$/;
      if (!addressPattern.test(opts.grpcAddress)) {
        throw new ConfigurationError(
          `Invalid grpcAddress format: "${opts.grpcAddress}". Expected "host:port"`
        );
      }
    }

    // Batch size validation
    if (opts.batchSize !== undefined && opts.batchSize < 1) {
      throw new ConfigurationError("batchSize must be >= 1");
    }

    // Attachment size validation
    if (opts.maxAttachmentSize !== undefined && opts.maxAttachmentSize < 0) {
      throw new ConfigurationError("maxAttachmentSize must be >= 0");
    }
  }
}
```

## Files to Modify

- `src/reporter.ts` (add validation)
- `src/utils/errors.ts` (add ConfigurationError)
- `tests/reporter.test.ts` (add validation tests)
- `README.md` (document valid ranges)

---

_Created: December 17, 2025_
