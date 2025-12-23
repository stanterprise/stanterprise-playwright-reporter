import { StanterpriseReporterOptions } from "../types";

/**
 * Define and map reporter options from provided options and environment variables. Apply defaults where necessary.
 * @param providedOptions Options provided during reporter initialization
 * @returns Mapped and completed StanterpriseReporterOptions
 */
export default function defineOptions(
  providedOptions: StanterpriseReporterOptions
): StanterpriseReporterOptions {
  const result: StanterpriseReporterOptions = {};
  result.grpcAddress =
    providedOptions.grpcAddress ||
    process.env.STANTERPRISE_GRPC_ADDRESS ||
    "localhost:50051";
  result.grpcEnabled =
    providedOptions.grpcEnabled ??
    (process.env.STANTERPRISE_GRPC_ENABLED || "true").toLowerCase() !== "false";
  result.grpcTimeout = providedOptions.grpcTimeout || 1000;
  result.verbose = providedOptions.verbose || false;

  return result;
}
