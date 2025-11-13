import { defineConfig, devices } from "@playwright/test";

/**
 * CI/CD configuration example for Stanterprise Playwright Reporter
 * 
 * This example shows a typical CI/CD setup with the reporter.
 * Use this in your continuous integration environment.
 */
export default defineConfig({
  testDir: "./tests",
  
  // Run tests in parallel in CI
  fullyParallel: true,
  
  // Fail the build on *.only in CI
  forbidOnly: true,
  
  // Retry failed tests in CI
  retries: 2,
  
  // Limit workers in CI to avoid resource issues
  workers: 2,
  
  // Strict timeout
  timeout: 30 * 1000,

  reporter: [
    // JUnit reporter for CI integration
    ["junit", { outputFile: "test-results/junit.xml" }],
    
    // JSON reporter for further processing
    ["json", { outputFile: "test-results/results.json" }],
    
    // Stanterprise reporter for real-time monitoring
    [
      "stanterprise-playwright-reporter",
      {
        grpcAddress: process.env.STANTERPRISE_GRPC_ADDRESS || "stanterprise-server:50051",
        grpcEnabled: true,
        grpcTimeout: 5000, // Longer timeout for CI
        verbose: true, // Enable verbose logging in CI
      },
    ],
  ],

  use: {
    // Always capture trace in CI for debugging
    trace: "retain-on-failure",
    
    // Capture screenshots on failure
    screenshot: "only-on-failure",
    
    // Record video on failure
    video: "retain-on-failure",
    
    // Use environment-specific base URL
    baseURL: process.env.BASE_URL || "http://staging.example.com",
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
  ],
});
