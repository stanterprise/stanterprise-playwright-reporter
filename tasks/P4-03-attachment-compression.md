# P4-03: Attachment Compression ⚪

**Priority**: LOW  
**Effort**: 2-3 hours  
**Status**: ⚠️ NOT STARTED - FUTURE ENHANCEMENT

> **Note**: Compression would reduce network bandwidth for large attachments. Nice optimization but not critical for functionality.

## Problem

Large attachments (screenshots, videos) consume significant bandwidth and storage:

- Network transfer costs
- Storage costs on server
- Slower event transmission

## Solution

Add gzip compression for attachment content before sending.

## Implementation

```typescript
import { gzipSync } from "zlib";

export interface StanterpriseReporterOptions {
  // ... existing options

  /**
   * Enable gzip compression for attachments
   * @default true
   */
  compressAttachments?: boolean;

  /**
   * Minimum size for compression (bytes)
   * Smaller attachments not worth compressing
   * @default 1KB
   */
  compressionThreshold?: number;
}

// In attachmentProcessor.ts:
export function processAttachments(
  result: TestResult,
  options?: {
    compress?: boolean;
    compressionThreshold?: number;
    // ... other options
  }
): InstanceType<typeof Attachment>[] {
  const {
    compress = true,
    compressionThreshold = 1024,
    // ...
  } = options || {};

  // ... existing code

  if (attachment.body) {
    let content = attachment.body;
    let isCompressed = false;

    // Compress if enabled and above threshold
    if (compress && content.length >= compressionThreshold) {
      try {
        const compressed = gzipSync(content);

        // Only use if compression actually reduced size
        if (compressed.length < content.length) {
          content = compressed;
          isCompressed = true;
        }
      } catch (error) {
        // Compression failed, use original
        if (verbose) {
          console.warn("Failed to compress attachment:", error);
        }
      }
    }

    att.content = content;

    // Add metadata about compression
    if (isCompressed) {
      att.metadata = att.metadata || {};
      att.metadata["compressed"] = "gzip";
      att.metadata["originalSize"] = String(attachment.body.length);
    }
  }

  return attachments;
}
```

## Benefits

- Typical compression ratio: 60-90% for text/JSON
- 20-50% for images (depending on format)
- Server can decompress or store compressed

## Files to Modify

- `src/types.ts`
- `src/utils/attachmentProcessor.ts`
- `README.md`

---

_Created: December 17, 2025_
