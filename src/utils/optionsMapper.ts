import { StanterpriseReporterOptions } from "../types";
import { resolveReporterOptions } from "../config";

/**
 * Define and map reporter options from provided options and environment variables. Apply defaults where necessary.
 * @param providedOptions Options provided during reporter initialization
 * @returns Mapped and completed StanterpriseReporterOptions
 */
export default function defineOptions(
  providedOptions: StanterpriseReporterOptions,
): StanterpriseReporterOptions {
  return resolveReporterOptions(providedOptions);
}
