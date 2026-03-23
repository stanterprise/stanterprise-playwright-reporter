import * as fs from "fs";
import { StanterpriseReporterOptions } from "../types";

/**
 * Creates or truncates the debug JSONL file so each test run starts with a clean file.
 * No-op when debug mode is disabled.
 */
export function initDebugFile(options: StanterpriseReporterOptions): void {
  if (!options.debug) return;
  const filePath = options.debugFile || "stanterprise-debug.jsonl";
  try {
    fs.writeFileSync(filePath, "");
  } catch (e) {
    console.error(
      `Stanterprise Reporter: Failed to initialize debug file "${filePath}":`,
      e,
    );
  }
}

/**
 * Appends a single JSONL entry for an outgoing gRPC message.
 * Each entry is a JSON object on its own line containing the timestamp,
 * gRPC method path, and the serialized message payload.
 * No-op when debug mode is disabled.
 */
export function writeDebugEntry(
  options: StanterpriseReporterOptions,
  path: string,
  message: unknown,
): void {
  if (!options.debug) return;
  const filePath = options.debugFile || "stanterprise-debug.jsonl";
  const entry = {
    timestamp: new Date().toISOString(),
    path,
    message,
  };
  try {
    fs.appendFileSync(filePath, JSON.stringify(entry) + "\n");
  } catch (e) {
    console.error(
      `Stanterprise Reporter: Failed to write debug entry to "${filePath}":`,
      e,
    );
  }
}
