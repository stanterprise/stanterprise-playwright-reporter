# Stanterprise Playwright Reporter Examples

This directory contains example configurations for using the Stanterprise Playwright Reporter.

## Examples

### 1. Basic Configuration (`playwright.config.basic.ts`)

The simplest setup using default options. Good for getting started.

```bash
npx playwright test --config=examples/playwright.config.basic.ts
```

**Features:**
- Minimal configuration
- Uses default gRPC settings
- Console output with list reporter

### 2. Advanced Configuration (`playwright.config.advanced.ts`)

A comprehensive example showing all available options.

```bash
npx playwright test --config=examples/playwright.config.advanced.ts
```

**Features:**
- All reporter options configured
- Multiple browsers and devices
- HTML report generation
- Conditional gRPC enabling based on environment

**Environment Variables:**
```bash
STANTERPRISE_GRPC_ADDRESS=myserver.com:50051 \
STANTERPRISE_GRPC_ENABLED=true \
DEBUG=true \
npx playwright test --config=examples/playwright.config.advanced.ts
```

### 3. CI/CD Configuration (`playwright.config.ci.ts`)

Optimized for continuous integration environments.

```bash
npx playwright test --config=examples/playwright.config.ci.ts
```

**Features:**
- Retries enabled for flaky tests
- Multiple output formats (JUnit, JSON)
- Trace and video recording on failure
- Verbose logging enabled

**CI Environment Variables:**
```bash
BASE_URL=https://staging.example.com \
STANTERPRISE_GRPC_ADDRESS=stanterprise-server:50051 \
npx playwright test --config=examples/playwright.config.ci.ts
```

## Sample Test

Create a simple test to see the reporter in action:

```typescript
// tests/example.spec.ts
import { test, expect } from '@playwright/test';

test('basic test example', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await expect(page).toHaveTitle(/Playwright/);
  
  // Take a screenshot
  await page.screenshot({ path: 'example.png' });
});

test('failing test example', async ({ page }) => {
  await page.goto('https://playwright.dev');
  
  // This will fail and trigger the reporter
  await expect(page).toHaveTitle(/This Will Fail/);
});
```

## Testing Different Scenarios

### Test with gRPC Enabled

```bash
STANTERPRISE_GRPC_ENABLED=true npx playwright test --config=examples/playwright.config.basic.ts
```

### Test with gRPC Disabled (Local Development)

```bash
STANTERPRISE_GRPC_ENABLED=false npx playwright test --config=examples/playwright.config.basic.ts
```

### Test with Custom Server Address

```bash
STANTERPRISE_GRPC_ADDRESS=production-server:50051 npx playwright test --config=examples/playwright.config.basic.ts
```

### Test with Verbose Logging

```bash
DEBUG=true npx playwright test --config=examples/playwright.config.advanced.ts
```

## Integrating with Your Project

To use these examples in your project:

1. Copy the configuration file that best matches your needs
2. Modify the paths and settings for your project
3. Add any project-specific configuration
4. Test locally before deploying to CI/CD

## Common Patterns

### Local Development (No Reporting)

```typescript
reporter: [
  ["list"],
  [
    "stanterprise-playwright-reporter",
    {
      grpcEnabled: false, // Disable in local dev
    },
  ],
],
```

### Production/Staging Only

```typescript
reporter: [
  ["list"],
  [
    "stanterprise-playwright-reporter",
    {
      grpcEnabled: process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging",
    },
  ],
],
```

### Multiple Reporters

```typescript
reporter: [
  ["html"],                           // For local viewing
  ["junit", { outputFile: "results.xml" }],  // For CI integration
  ["json", { outputFile: "results.json" }],  // For custom processing
  ["stanterprise-playwright-reporter"],      // For real-time monitoring
],
```

## Troubleshooting

If the reporter isn't working as expected:

1. Enable verbose logging: `verbose: true`
2. Check gRPC server connectivity
3. Verify environment variables are set correctly
4. Look for error messages in the console output

For more help, see the [main README](../README.md).
