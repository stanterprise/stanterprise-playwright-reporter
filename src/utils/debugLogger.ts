import * as fs from "fs";
import * as nodePath from "path";
import { StanterpriseReporterOptions } from "../types";

/**
 * Ensures the parent directory of `filePath` exists, creating it recursively if needed.
 */
function ensureParentDir(filePath: string): void {
  const dir = nodePath.dirname(filePath);
  if (dir && dir !== ".") {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Creates or truncates the debug JSONL file so each test run starts with a clean file.
 * No-op when debug mode is disabled.
 */
export function initDebugFile(options: StanterpriseReporterOptions): void {
  if (!options.debug) return;
  const filePath = options.debugFile || "stanterprise-debug.jsonl";
  try {
    ensureParentDir(filePath);
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
export async function writeDebugEntry(
  options: StanterpriseReporterOptions,
  path: string,
  message: unknown,
): Promise<void> {
  if (!options.debug) return;
  const filePath = options.debugFile || "stanterprise-debug.jsonl";
  const entry = {
    timestamp: new Date().toISOString(),
    path,
    message,
  };
  try {
    ensureParentDir(filePath);
    await fs.promises.appendFile(filePath, JSON.stringify(entry) + "\n");
  } catch (e) {
    console.error(
      `Stanterprise Reporter: Failed to write debug entry to "${filePath}":`,
      e,
    );
  }
}
