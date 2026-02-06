import { StanterpriseReporterOptions } from "../types";
import * as grpc from "@grpc/grpc-js";

export default function getClient(
  options: StanterpriseReporterOptions
): grpc.Client | null {
  try {
    const maxMessageSize = options.grpcMaxMessageSize || 104857600; // 100MB default

    return new grpc.Client(
      options.grpcAddress!,
      grpc.credentials.createInsecure(),
      {
        "grpc.max_send_message_length": maxMessageSize,
        "grpc.max_receive_message_length": maxMessageSize,
      }
    );
  } catch (e) {
    console.error("Failed to create gRPC client", e);
  }

  return null;
}

/**
 * Determines if a gRPC error code represents a transient failure worth retrying
 */
function shouldAttemptRetryForCode(errorCode: grpc.status): boolean {
  const transientCodes = new Set([
    grpc.status.UNAVAILABLE,
    grpc.status.DEADLINE_EXCEEDED,
    grpc.status.INTERNAL,
    grpc.status.UNKNOWN,
  ]);
  
  return transientCodes.has(errorCode);
}

/**
 * Calculates wait time using power-of-two exponential backoff
 */
function calculateWaitDuration(baseDelayMs: number, attemptsSoFar: number): number {
  return baseDelayMs * Math.pow(2, attemptsSoFar);
}

/**
 * Performs a single gRPC unary request attempt
 */
function executeSingleAttempt(
  grpcClient: grpc.Client,
  path: string,
  message: {
    serialize?: (w?: any) => Uint8Array;
    serializeBinary?: () => Uint8Array;
  },
  deadlineMs: number
): Promise<Buffer> {
  const reqSerialize = (arg: unknown): Buffer => {
    const m = arg as
      | {
          serializeBinary?: () => Uint8Array;
          serialize?: (w?: any) => Uint8Array;
        }
      | undefined;
    const bytes = m?.serializeBinary
      ? m.serializeBinary()
      : m?.serialize
      ? m.serialize()
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
      (
        grpcClient as unknown as {
          makeUnaryRequest: (
            path: string,
            serialize: (arg: unknown) => Buffer,
            deserialize: (arg: Buffer) => Buffer,
            arg: unknown,
            metadata: grpc.Metadata,
            options: grpc.CallOptions,
            callback: (err: grpc.ServiceError | null, res: Buffer) => void
          ) => void;
        }
      ).makeUnaryRequest(
        path,
        reqSerialize,
        resDeserialize,
        message,
        metadata,
        callOptions,
        (err, response) => {
          if (err) return reject(err);
          resolve(response);
        }
      );
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Pauses execution for specified milliseconds
 */
function pauseExecution(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

/**
 * Recursively attempts gRPC call with exponential backoff retry logic
 */
async function attemptWithRetries(
  options: StanterpriseReporterOptions,
  grpcClient: grpc.Client,
  path: string,
  message: {
    serialize?: (w?: any) => Uint8Array;
    serializeBinary?: () => Uint8Array;
  },
  deadlineMs: number,
  retriesRemaining: number,
  attemptNumber: number
): Promise<Buffer> {
  try {
    return await executeSingleAttempt(grpcClient, path, message, deadlineMs);
  } catch (err) {
    const grpcErr = err as grpc.ServiceError;
    const statusCode = grpcErr?.code ?? grpc.status.UNKNOWN;
    
    // Check if we should retry this error
    const isRetryable = shouldAttemptRetryForCode(statusCode);
    const hasRetriesLeft = retriesRemaining > 0;
    
    if (!isRetryable || !hasRetriesLeft) {
      throw err;
    }
    
    // Log retry attempt if verbose
    if (options.verbose) {
      console.log(
        `gRPC call failed (code: ${statusCode}), retrying... ` +
        `(attempt ${attemptNumber + 1}, ${retriesRemaining} retries left)`
      );
    }
    
    // Calculate and wait for backoff duration
    const baseDelay = options.grpcRetryDelay ?? 100;
    const waitTime = calculateWaitDuration(baseDelay, attemptNumber);
    await pauseExecution(waitTime);
    
    // Recursive retry
    return attemptWithRetries(
      options,
      grpcClient,
      path,
      message,
      deadlineMs,
      retriesRemaining - 1,
      attemptNumber + 1
    );
  }
}

/**
 * Helper: generic unary call using raw method path with retry support
 */
export async function reportUnary(
  options: StanterpriseReporterOptions,
  grpcClient: grpc.Client,
  path: string,
  message: {
    serialize?: (w?: any) => Uint8Array;
    serializeBinary?: () => Uint8Array;
  },
  deadlineMs: number = 1000
): Promise<Buffer> {
  if (!options.grpcEnabled || !grpcClient) {
    return Buffer.alloc(0);
  }

  const maxRetries = options.grpcMaxRetries ?? 3;
  
  return attemptWithRetries(
    options,
    grpcClient,
    path,
    message,
    deadlineMs,
    maxRetries,
    0
  );
}
