import { StanterpriseReporterOptions } from "../types";
import * as grpc from "@grpc/grpc-js";

export default function getClient(
  options: StanterpriseReporterOptions
): grpc.Client | null {
  try {
    return new grpc.Client(
      options.grpcAddress!,
      grpc.credentials.createInsecure()
    );
  } catch (e) {
    console.error("Failed to create gRPC client", e);
  }

  return null;
}
// Helper: generic unary call using raw method path
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
