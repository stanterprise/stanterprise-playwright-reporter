import { defineConfig, devices } from "@playwright/test";

/**
 * Basic configuration example for Stanterprise Playwright Reporter
 * 
 * This example shows the minimal setup required to use the reporter.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Basic reporter configuration
  reporter: [
    ["list"], // Show results in console
    ["stanterprise-playwright-reporter"], // Send results to Stanterprise
  ],

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
