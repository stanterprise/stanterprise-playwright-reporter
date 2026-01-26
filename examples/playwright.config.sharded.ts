import { defineConfig } from "@playwright/test";
import path from "path";

/**
 * Example Playwright configuration demonstrating shard reporting
 *
 * This configuration shows how to run tests in sharded mode.
 * When sharding is enabled, the reporter will automatically include
 * shard information in the metadata sent to the server:
 * - shard.current: The current shard number (1-based)
 * - shard.total: The total number of shards
 *
 * Run with:
 * npx playwright test --config=examples/playwright.config.sharded.ts
 */
export default defineConfig({
  testDir: path.join(__dirname, "tests"),

  // Shard configuration - run this shard out of total shards
  // You can override this from CLI: --shard=2/5
  shard: { total: 3, current: 1 },

  // Use 1 worker per shard to see clear separation
  workers: 1,

  reporter: [
    ["list"],
    [
      path.join(__dirname, "..", "src", "reporter.ts"),
      {
        grpcAddress: process.env.STANTERPRISE_GRPC_ADDRESS || "localhost:50051",
        grpcEnabled: process.env.STANTERPRISE_GRPC_ENABLED !== "false",
        verbose: true,
      },
    ],
  ],

  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
