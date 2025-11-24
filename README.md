# stanterprise-playwright-reporter

Custom Playwright test reporter that sends test results to Stanterprise via gRPC.

## Features

- 📊 **Comprehensive Test Reporting**: Reports test lifecycle events including begin, end, and failures
- 🔄 **Step Tracking**: Tracks and reports individual test steps with timing and status
- 📎 **Attachment Support**: Handles screenshots, videos, and other test attachments
- 🔌 **gRPC Integration**: Communicates with Stanterprise backend via gRPC protocol
- ⚙️ **Configurable**: Supports environment variables and configuration options
- 🛡️ **Error Resilient**: Graceful error handling that doesn't interrupt test execution

## Installation

```bash
npm install stanterprise-playwright-reporter --save-dev
```

## Configuration

### Basic Setup

Add the reporter to your `playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["stanterprise-playwright-reporter"]],
  // ... other config
});
```

### Advanced Configuration

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    [
      "stanterprise-playwright-reporter",
      {
        grpcAddress: "localhost:50051", // gRPC server address
        grpcEnabled: true, // Enable/disable gRPC reporting
        grpcTimeout: 1000, // Timeout for gRPC calls in milliseconds
        verbose: false, // Enable verbose logging
      },
    ],
  ],
  // ... other config
});
```

### Environment Variables

You can also configure the reporter using environment variables:

- `STANTERPRISE_GRPC_ADDRESS`: gRPC server address (default: `localhost:50051`)
- `STANTERPRISE_GRPC_ENABLED`: Enable/disable gRPC reporting (default: `true`)

Example:

```bash
STANTERPRISE_GRPC_ADDRESS=myserver.com:50051 npx playwright test
```

## Configuration Options

| Option         | Type    | Default          | Description                               |
| -------------- | ------- | ---------------- | ----------------------------------------- |
| `grpcAddress`  | string  | `localhost:50051`| gRPC server address                       |
| `grpcEnabled`  | boolean | `true`           | Enable/disable gRPC reporting             |
| `grpcTimeout`  | number  | `1000`           | Timeout for gRPC calls in milliseconds    |
| `verbose`      | boolean | `false`          | Enable verbose logging                    |

## What Gets Reported

### Test Events

- **Test Begin**: When a test starts
- **Test End**: When a test completes with status (passed/failed/skipped/timedOut)
- **Test Failure**: Detailed failure information including error messages and stack traces

### Step Events

- **Step Begin**: When a test step starts
- **Step End**: When a test step completes with duration and status

### Attachments

The reporter automatically processes and sends:
- Screenshots
- Videos
- Trace files
- Any other attachments captured during test execution

## Usage Example

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  reporter: [
    ["list"], // Also show in console
    [
      "stanterprise-playwright-reporter",
      {
        grpcAddress: process.env.STANTERPRISE_GRPC_ADDRESS || "localhost:50051",
        verbose: process.env.CI === "true",
      },
    ],
  ],
});
```

## API

### StanterpriseReporter

Main reporter class implementing Playwright's `Reporter` interface.

```typescript
import { StanterpriseReporter } from "stanterprise-playwright-reporter";

const reporter = new StanterpriseReporter({
  grpcAddress: "localhost:50051",
  grpcEnabled: true,
  grpcTimeout: 1000,
  verbose: false,
});
```

### Types

```typescript
import type {
  StanterpriseReporterOptions,
  TestExecutionContext,
  StepExecutionContext,
} from "stanterprise-playwright-reporter";
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Cleaning

```bash
npm run clean
```

## How It Works

1. **Test Run Initialization**: When tests start, the reporter generates a unique run ID and establishes a gRPC connection
2. **Event Reporting**: As tests execute, the reporter sends events to the Stanterprise backend via gRPC
3. **Fire-and-Forget**: Events are sent asynchronously to avoid slowing down test execution
4. **Error Handling**: Connection errors are logged once and further attempts are disabled for that run
5. **Cleanup**: When tests complete, the gRPC connection is properly closed

## Architecture

The reporter is organized into several modules:

- **reporter.ts**: Main reporter implementation
- **types.ts**: TypeScript type definitions and interfaces
- **utils/statusMapper.ts**: Maps Playwright statuses to protobuf enums
- **utils/attachmentProcessor.ts**: Processes test attachments
- **utils/timeHelpers.ts**: Handles timestamp and duration conversions

## Troubleshooting

### Connection Issues

If you see gRPC connection errors:

1. Verify the gRPC server is running and accessible
2. Check the `grpcAddress` configuration
3. Ensure firewall rules allow the connection
4. Enable verbose logging to see detailed error messages

### Reporter Not Working

1. Verify the reporter is properly configured in `playwright.config.ts`
2. Check that `grpcEnabled` is not set to `false`
3. Look for error messages in the test output
4. Try with `verbose: true` to see detailed logs

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## For Maintainers

### Publishing to NPM

1. Ensure all tests pass:
   ```bash
   npm test
   ```

2. Update the version in `package.json` following [semantic versioning](https://semver.org/):
   ```bash
   npm version patch  # for bug fixes
   npm version minor  # for new features
   npm version major  # for breaking changes
   ```

3. The `prepublishOnly` script will automatically build the package before publishing

4. Publish to NPM:
   ```bash
   npm publish
   ```

5. Push the version tag to GitHub:
   ```bash
   git push --follow-tags
   ```

### What Gets Published

The package includes:
- `dist/` - Compiled JavaScript and TypeScript declarations
- `README.md` - Documentation

The following are excluded via `.npmignore`:
- Source files (`src/`, `tests/`, `examples/`)
- Development configuration files
- Build artifacts and logs

## License

ISC - See [LICENSE](LICENSE) file for details

## Support

For issues and questions, please visit the [GitHub repository](https://github.com/stanterprise/stanterprise-playwright-reporter).

