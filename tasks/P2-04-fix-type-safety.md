# P2-04: Fix Type Safety Gaps 🟡

**Priority**: HIGH  
**Effort**: 1-2 hours  
**Status**: ✅ MOSTLY COMPLETE

> **Note**: The `createDuration()` function in `src/utils/timeHelpers.ts` already returns a proper Duration type with comprehensive JSDoc explaining the Timestamp/Duration compatibility. Type safety has been improved throughout the codebase with proper TypeScript types.

## Problem

Several type safety gaps exist in the codebase:

1. **`createDuration` returns `any`**:

   ```typescript
   export function createDuration(durationMs: number): any {
     return new Timestamp({...});
   }
   ```

2. **Loose protobuf type assertions** in `reportUnary`:

   ```typescript
   private async reportUnary(
     path: string,
     message: {
       serialize?: (w?: any) => Uint8Array;
       serializeBinary?: () => Uint8Array;
     },
     deadlineMs: number = 1000
   ): Promise<Buffer>
   ```

3. **Missing proper error types** - generic `Error` used everywhere

4. **Type assertions with `as any`** in gRPC client calls

## Solution

Improve type safety across the codebase:

- Define proper types for protobuf Duration
- Create typed error classes
- Add strict type guards
- Remove `any` types where possible

## Implementation Steps

### Step 1: Create Proper Duration Type

**File**: `src/utils/timeHelpers.ts`

```typescript
import { google } from "@stanterprise/protobuf";

const Timestamp = google.google.protobuf.Timestamp;

// Define Duration interface matching protobuf structure
export interface Duration {
  seconds: number;
  nanos: number;
}

/**
 * Create a protobuf Timestamp from a JavaScript Date
 */
export function createTimestamp(date: Date): InstanceType<typeof Timestamp> {
  return new Timestamp({
    seconds: Math.floor(date.getTime() / 1000),
    nanos: (date.getTime() % 1000) * 1000000,
  });
}

/**
 * Create a protobuf Timestamp from milliseconds since epoch
 */
export function createTimestampFromMs(
  ms: number
): InstanceType<typeof Timestamp> {
  return new Timestamp({
    seconds: Math.floor(ms / 1000),
    nanos: (ms % 1000) * 1000000,
  });
}

/**
 * Create a duration object from milliseconds.
 *
 * NOTE: google.protobuf.Duration is defined in the @stanterprise/protobuf schema
 * but not exported in the package's main barrel export. Since Duration and Timestamp
 * have identical structure (seconds: number, nanos: number) and the protobuf serialization
 * is wire-compatible, we use Timestamp as a Duration substitute. This works correctly at runtime.
 *
 * @param durationMs Duration in milliseconds
 * @returns A Duration-compatible object (implemented as Timestamp due to export limitations)
 */
export function createDuration(durationMs: number): Duration {
  return new Timestamp({
    seconds: Math.floor(durationMs / 1000),
    nanos: (durationMs % 1000) * 1000000,
  }) as Duration;
}

/**
 * Convert Duration to milliseconds
 */
export function durationToMs(duration: Duration): number {
  return duration.seconds * 1000 + Math.floor(duration.nanos / 1000000);
}

/**
 * Type guard for Duration
 */
export function isDuration(obj: unknown): obj is Duration {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "seconds" in obj &&
    "nanos" in obj &&
    typeof (obj as Duration).seconds === "number" &&
    typeof (obj as Duration).nanos === "number"
  );
}
```

### Step 2: Create Error Type Hierarchy

**File**: `src/utils/errors.ts`

```typescript
/**
 * Base error class for reporter errors
 */
export class ReporterError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ReporterError";

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ReporterError.prototype);
  }
}

/**
 * gRPC-related errors
 */
export class GrpcError extends ReporterError {
  constructor(
    message: string,
    public readonly grpcCode?: number,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = "GrpcError";
    Object.setPrototypeOf(this, GrpcError.prototype);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ReporterError {
  constructor(
    message: string,
    public readonly option?: string,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Serialization errors
 */
export class SerializationError extends ReporterError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "SerializationError";
    Object.setPrototypeOf(this, SerializationError.prototype);
  }
}

/**
 * Type guard for ReporterError
 */
export function isReporterError(error: unknown): error is ReporterError {
  return error instanceof ReporterError;
}

/**
 * Type guard for GrpcError
 */
export function isGrpcError(error: unknown): error is GrpcError {
  return error instanceof GrpcError;
}

/**
 * Wrap unknown error in ReporterError
 */
export function wrapError(error: unknown, message?: string): ReporterError {
  if (isReporterError(error)) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  return new ReporterError(
    message ? `${message}: ${errorMessage}` : errorMessage,
    error
  );
}
```

### Step 3: Create Protobuf Message Type

**File**: `src/types.ts`

```typescript
/**
 * Base interface for protobuf messages
 */
export interface ProtobufMessage {
  serialize?: (writer?: any) => Uint8Array;
  serializeBinary?: () => Uint8Array;
}

/**
 * Type guard for protobuf messages
 */
export function isProtobufMessage(obj: unknown): obj is ProtobufMessage {
  return (
    typeof obj === "object" &&
    obj !== null &&
    ("serialize" in obj || "serializeBinary" in obj)
  );
}
```

### Step 4: Update Reporter to Use Typed Errors

**File**: `src/reporter.ts`

```typescript
import {
  GrpcError,
  ConfigurationError,
  wrapError,
  isGrpcError,
} from "./utils/errors";
import type { ProtobufMessage } from "./types";
import type { Duration } from "./utils/timeHelpers";

export default class StanterpriseReporter implements Reporter {
  // ... existing code

  constructor(options: StanterpriseReporterOptions = {}) {
    // Validate configuration
    if (options.grpcTimeout && options.grpcTimeout < 0) {
      throw new ConfigurationError("grpcTimeout must be >= 0", "grpcTimeout");
    }

    if (options.grpcMaxRetries && options.grpcMaxRetries < 0) {
      throw new ConfigurationError(
        "grpcMaxRetries must be >= 0",
        "grpcMaxRetries"
      );
    }

    // ... rest of initialization
  }

  /**
   * Helper: generic unary call using raw method path
   */
  private async reportUnary(
    path: string,
    message: ProtobufMessage,
    deadlineMs: number = 1000
  ): Promise<Buffer> {
    if (!this.grpcEnabled || !this.grpcClient) {
      return Buffer.alloc(0);
    }

    const reqSerialize = (arg: unknown): Buffer => {
      if (!isProtobufMessage(arg)) {
        throw new SerializationError("Invalid protobuf message");
      }

      const bytes = arg.serializeBinary
        ? arg.serializeBinary()
        : arg.serialize
        ? arg.serialize()
        : new Uint8Array(0);
      return Buffer.from(bytes);
    };

    const resDeserialize = (bytes: Buffer): Buffer => bytes;

    const metadata = new grpc.Metadata();
    const callOptions: grpc.CallOptions = {
      deadline: new Date(Date.now() + deadlineMs),
    };

    return new Promise<Buffer>((resolve, reject) => {
      try {
        // Type-safe gRPC client call
        const client = this.grpcClient as grpc.Client & {
          makeUnaryRequest: (
            path: string,
            serialize: (arg: unknown) => Buffer,
            deserialize: (arg: Buffer) => Buffer,
            arg: unknown,
            metadata: grpc.Metadata,
            options: grpc.CallOptions,
            callback: (err: grpc.ServiceError | null, res: Buffer) => void
          ) => void;
        };

        client.makeUnaryRequest(
          path,
          reqSerialize,
          resDeserialize,
          message,
          metadata,
          callOptions,
          (err, response) => {
            if (err) {
              return reject(
                new GrpcError(`gRPC call failed: ${err.message}`, err.code, err)
              );
            }
            resolve(response);
          }
        );
      } catch (e) {
        reject(wrapError(e, "gRPC request error"));
      }
    });
  }

  /**
   * Helper: log first gRPC error once and disable further attempts
   */
  private logGrpcErrorOnce(prefix: string, err: unknown): void {
    if (this.grpcFirstErrorLogged) return;
    this.grpcFirstErrorLogged = true;

    const details = isGrpcError(err)
      ? `${err.message} (code: ${err.grpcCode})`
      : err instanceof Error
      ? err.message
      : String(err);

    console.warn(
      `${prefix}. gRPC disabled for the remainder of the run. Address=${this.grpcAddress}. Details: ${details}`
    );
    this.grpcEnabled = false;
  }
}
```

### Step 5: Add Type Tests

**File**: `tests/types.test.ts`

```typescript
import {
  isDuration,
  durationToMs,
  createDuration,
} from "../src/utils/timeHelpers";
import {
  ReporterError,
  GrpcError,
  ConfigurationError,
  isReporterError,
  isGrpcError,
  wrapError,
} from "../src/utils/errors";

describe("Type Utilities", () => {
  describe("Duration", () => {
    it("should validate duration objects", () => {
      const duration = { seconds: 5, nanos: 500000000 };
      expect(isDuration(duration)).toBe(true);
      expect(isDuration({})).toBe(false);
      expect(isDuration(null)).toBe(false);
    });

    it("should convert duration to milliseconds", () => {
      const duration = createDuration(5500);
      expect(durationToMs(duration)).toBe(5500);
    });
  });

  describe("Errors", () => {
    it("should create typed errors", () => {
      const error = new GrpcError("Connection failed", 14);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ReporterError);
      expect(error).toBeInstanceOf(GrpcError);
      expect(error.grpcCode).toBe(14);
    });

    it("should identify error types", () => {
      const grpcError = new GrpcError("test", 14);
      const configError = new ConfigurationError("test", "grpcAddress");

      expect(isReporterError(grpcError)).toBe(true);
      expect(isGrpcError(grpcError)).toBe(true);
      expect(isGrpcError(configError)).toBe(false);
    });

    it("should wrap unknown errors", () => {
      const wrapped = wrapError("string error");
      expect(wrapped).toBeInstanceOf(ReporterError);
      expect(wrapped.cause).toBe("string error");
    });
  });
});
```

### Step 6: Enable Strict Type Checking

**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Acceptance Criteria

- [ ] `createDuration` returns proper `Duration` type
- [ ] Error class hierarchy implemented
- [ ] Type guards added for critical types
- [ ] All `any` types removed or justified
- [ ] Strict type checking enabled
- [ ] Type tests added
- [ ] No TypeScript errors or warnings
- [ ] Documentation updated with type information

## Files to Create

- `src/utils/errors.ts`
- `tests/types.test.ts`

## Files to Modify

- `src/types.ts`
- `src/utils/timeHelpers.ts`
- `src/utils/index.ts`
- `src/reporter.ts`
- `tsconfig.json`

---

_Created: December 17, 2025_
