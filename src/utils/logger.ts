import { StanterpriseReporterOptions } from "../types";

export interface ReporterLogger {
  verbose: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createReporterLogger(
  options: StanterpriseReporterOptions,
): ReporterLogger {
  const isVerbose = Boolean(options.verbose);

  return {
    verbose: (...args: unknown[]) => {
      if (isVerbose) {
        console.log(...args);
      }
    },
    info: (...args: unknown[]) => {
      console.log(...args);
    },
    warn: (...args: unknown[]) => {
      console.warn(...args);
    },
    error: (...args: unknown[]) => {
      console.error(...args);
    },
  };
}
