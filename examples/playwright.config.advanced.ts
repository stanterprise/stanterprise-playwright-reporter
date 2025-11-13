import { defineConfig, devices } from "@playwright/test";

/**
 * Advanced configuration example for Stanterprise Playwright Reporter
 * 
 * This example shows all available configuration options.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },

  // Advanced reporter configuration
  reporter: [
    ["html"], // HTML report for local viewing
    ["list"], // Console output
    [
      "stanterprise-playwright-reporter",
      {
        // gRPC server address - can also use STANTERPRISE_GRPC_ADDRESS env var
        grpcAddress: process.env.STANTERPRISE_GRPC_ADDRESS || "localhost:50051",
        
        // Enable/disable reporting - useful for local development
        grpcEnabled: process.env.CI === "true" || process.env.STANTERPRISE_GRPC_ENABLED === "true",
        
        // Timeout for gRPC calls in milliseconds
        grpcTimeout: 2000,
        
        // Enable verbose logging for debugging
        verbose: process.env.DEBUG === "true",
      },
    ],
  ],

  use: {
    // Capture trace on first retry for debugging
    trace: "on-first-retry",
    
    // Take screenshots on failure
    screenshot: "only-on-failure",
    
    // Record video on failure
    video: "retain-on-failure",
    
    // Base URL for tests
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    
    // Browser options
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  // Web server to start before tests
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
