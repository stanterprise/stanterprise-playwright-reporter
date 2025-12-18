import { defineConfig, devices } from "@playwright/test";

/**
 * Test configuration for nested suites testing
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  
  // Reporter configuration with verbose mode
  reporter: [
    ["list"],
    ["../dist/index.js", { verbose: true, grpcEnabled: false }],
  ],

  use: {
    trace: "off",
    screenshot: "off",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
