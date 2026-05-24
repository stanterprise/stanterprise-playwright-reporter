import { StanterpriseReporterOptions } from "../types";

/**
 * Define and map reporter options from provided options and environment variables. Apply defaults where necessary.
 * @param providedOptions Options provided during reporter initialization
 * @returns Mapped and completed StanterpriseReporterOptions
 */
export default function defineOptions(
  providedOptions: StanterpriseReporterOptions,
): StanterpriseReporterOptions {
  const result: StanterpriseReporterOptions = {} as StanterpriseReporterOptions;
  result.grpcAddress = identifyAddress(providedOptions);
  result.grpcEnabled =
    providedOptions.grpcEnabled ??
    (process.env.STANTERPRISE_GRPC_ENABLED || "true").toLowerCase() !== "false";
  result.grpcTimeout = providedOptions.grpcTimeout ?? 1000;
  result.grpcMaxMessageSize = providedOptions.grpcMaxMessageSize ?? 104_857_600;
  result.maxAttachmentSize = providedOptions.maxAttachmentSize ?? 10_485_760;
  result.verbose = providedOptions.verbose ?? false;
  result.grpcMaxRetries = providedOptions.grpcMaxRetries ?? 3;
  result.grpcRetryDelay = providedOptions.grpcRetryDelay ?? 100;
  result.debug =
    providedOptions.debug ??
    (process.env.STANTERPRISE_DEBUG || "").toLowerCase() === "true";
  result.debugFile =
    providedOptions.debugFile ||
    process.env.STANTERPRISE_DEBUG_FILE ||
    "stanterprise-debug.jsonl";

  result.tls =
    providedOptions.tls ??
    (process.env.STANTERPRISE_GRPC_TLS || "true").toLowerCase() === "true";

  return result;
}

function identifyAddress(providedOptions: StanterpriseReporterOptions): string {
  if (providedOptions.grpcAddress) {
    return providedOptions.grpcAddress;
  }
  if (process.env.STANTERPRISE_GRPC_ADDRESS) {
    return process.env.STANTERPRISE_GRPC_ADDRESS;
  }
  if (process.env.STANTERPRISE_GRPC_HOST) {
    const host = process.env.STANTERPRISE_GRPC_HOST;
    const port = process.env.STANTERPRISE_GRPC_PORT || "50051";
    return `${host}:${port}`;
  }
  if (providedOptions.grpcHost) {
    const host = providedOptions.grpcHost;
    const port = providedOptions.grpcPort ?? 50051;
    return `${host}:${port}`;
  }

  return "localhost:50051";
}
