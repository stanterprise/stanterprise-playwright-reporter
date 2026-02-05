import { StanterpriseReporterOptions } from "./types";

const DEFAULT_GRPC_ADDRESS = "localhost:50051";
const DEFAULT_GRPC_ENABLED = true;
const DEFAULT_GRPC_TIMEOUT_MS = 1000;
const DEFAULT_GRPC_MAX_MESSAGE_SIZE = 104857600;
const DEFAULT_GRPC_RETRY_ATTEMPTS = 3;
const DEFAULT_GRPC_RETRY_BASE_DELAY_MS = 50;
const DEFAULT_GRPC_RETRY_MAX_DELAY_MS = 300;
const DEFAULT_GRPC_RETRY_JITTER = 0.2;
const DEFAULT_MAX_ATTACHMENT_SIZE = 10485760;
const DEFAULT_VERBOSE = false;

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveReporterOptions(
  providedOptions: StanterpriseReporterOptions = {},
): StanterpriseReporterOptions {
  const envGrpcEnabled = parseBoolean(process.env.STANTERPRISE_GRPC_ENABLED);
  const envVerbose = parseBoolean(process.env.STANTERPRISE_VERBOSE);

  return {
    grpcAddress:
      providedOptions.grpcAddress ||
      process.env.STANTERPRISE_GRPC_ADDRESS ||
      DEFAULT_GRPC_ADDRESS,
    grpcEnabled:
      providedOptions.grpcEnabled ?? envGrpcEnabled ?? DEFAULT_GRPC_ENABLED,
    grpcTimeout:
      providedOptions.grpcTimeout ??
      parseNumber(process.env.STANTERPRISE_GRPC_TIMEOUT_MS) ??
      DEFAULT_GRPC_TIMEOUT_MS,
    grpcMaxMessageSize:
      providedOptions.grpcMaxMessageSize ??
      parseNumber(process.env.STANTERPRISE_GRPC_MAX_MESSAGE_SIZE) ??
      DEFAULT_GRPC_MAX_MESSAGE_SIZE,
    grpcRetryAttempts:
      providedOptions.grpcRetryAttempts ??
      parseNumber(process.env.STANTERPRISE_GRPC_RETRY_ATTEMPTS) ??
      DEFAULT_GRPC_RETRY_ATTEMPTS,
    grpcRetryBaseDelayMs:
      providedOptions.grpcRetryBaseDelayMs ??
      parseNumber(process.env.STANTERPRISE_GRPC_RETRY_BASE_DELAY_MS) ??
      DEFAULT_GRPC_RETRY_BASE_DELAY_MS,
    grpcRetryMaxDelayMs:
      providedOptions.grpcRetryMaxDelayMs ??
      parseNumber(process.env.STANTERPRISE_GRPC_RETRY_MAX_DELAY_MS) ??
      DEFAULT_GRPC_RETRY_MAX_DELAY_MS,
    grpcRetryJitter:
      providedOptions.grpcRetryJitter ??
      parseNumber(process.env.STANTERPRISE_GRPC_RETRY_JITTER) ??
      DEFAULT_GRPC_RETRY_JITTER,
    maxAttachmentSize:
      providedOptions.maxAttachmentSize ??
      parseNumber(process.env.STANTERPRISE_MAX_ATTACHMENT_SIZE) ??
      DEFAULT_MAX_ATTACHMENT_SIZE,
    verbose: providedOptions.verbose ?? envVerbose ?? DEFAULT_VERBOSE,
  };
}
