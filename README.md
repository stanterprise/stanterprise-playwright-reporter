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
        grpcMaxMessageSize: 104857600, // Max message size (100MB default)
        maxAttachmentSize: 10485760, // Max attachment size (10MB default)
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
- `STANTERPRISE_META_*`: Custom metadata fields for test runs (prefix will be stripped)

#### Custom Metadata

Any environment variable with the `STANTERPRISE_META_` prefix will be automatically included in the test run metadata. The prefix is stripped from the key name.

For example:

- `STANTERPRISE_META_BUILD_ID=12345` becomes `BUILD_ID: 12345` in metadata
- `STANTERPRISE_META_BRANCH=main` becomes `BRANCH: main` in metadata
- `STANTERPRISE_META_COMMIT_SHA=abc123` becomes `COMMIT_SHA: abc123` in metadata

Example:

```bash
STANTERPRISE_GRPC_ADDRESS=myserver.com:50051 \
STANTERPRISE_META_BUILD_ID=12345 \
STANTERPRISE_META_BRANCH=main \
npx playwright test
```

## Configuration Options

| Option               | Type    | Default           | Description                                         |
| -------------------- | ------- | ----------------- | --------------------------------------------------- |
| `grpcAddress`        | string  | `localhost:50051` | gRPC server address                                 |
| `grpcEnabled`        | boolean | `true`            | Enable/disable gRPC reporting                       |
| `grpcTimeout`        | number  | `1000`            | Timeout for gRPC calls in milliseconds              |
| `grpcMaxMessageSize` | number  | `104857600`       | Max message size in bytes (100MB default)           |
| `maxAttachmentSize`  | number  | `10485760`        | Max attachment content size in bytes (10MB default) |
| `verbose`            | boolean | `false`           | Enable verbose logging                              |

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
  grpcMaxMessageSize: 104857600, // 100MB
  maxAttachmentSize: 10485760, // 10MB
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

### gRPC Error 13 INTERNAL: failed to publish event

This error typically occurs due to one of two issues:

**1. Metadata Serialization (Most Common)**

If you see this error with the stack trace mentioning "metadata is not iterable" or serialization issues, it was a bug in v0.0.13 and earlier versions. **Solution: Upgrade to v0.0.14 or later.**

**2. Large Attachments**

This error can also occur when test event payloads exceed the gRPC message size limit. Common causes:

1. **Large attachments**: Tests with large screenshots, videos, or trace files
2. **Default size limits**: gRPC has a default 4MB message size limit

**Solutions:**

1. **Increase message size limits** (recommended):

   ```typescript
   reporter: [
     [
       "stanterprise-playwright-reporter",
       {
         grpcMaxMessageSize: 104857600, // 100MB (default)
         maxAttachmentSize: 10485760,   // 10MB (default)
       },
     ],
   ],
   ```

2. **Reduce attachment sizes**:

   - Configure Playwright to save attachments to disk instead of embedding them
   - The reporter automatically uses file paths when available instead of content

   ```typescript
   use: {
     screenshot: "only-on-failure",
     video: "retain-on-failure",
     trace: "retain-on-failure",
   },
   ```

3. **Monitor payload sizes**: Enable verbose logging to see actual payload sizes:
   ```typescript
   reporter: [
     ["stanterprise-playwright-reporter", { verbose: true }],
   ],
   ```

The reporter will log warnings when attachments exceed the size limit and automatically skip their content while preserving metadata.

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

#### Automated Publishing (Recommended)

The repository uses GitHub Actions to automatically publish to NPM when a version tag is pushed:

1. Update the version following [semantic versioning](https://semver.org/):

   ```bash
   npm version patch  # for bug fixes (1.0.0 → 1.0.1)
   npm version minor  # for new features (1.0.0 → 1.1.0)
   npm version major  # for breaking changes (1.0.0 → 2.0.0)
   ```

2. Push the version tag to GitHub:

   ```bash
   git push --follow-tags
   ```

3. The GitHub Actions workflow will automatically:
   - Run tests
   - Build the package
   - Publish to NPM with provenance

**Note**: Requires `NPM_TOKEN` secret to be configured in GitHub repository settings with a valid NPM access token.

#### Manual Publishing

Alternatively, you can publish manually:

1. Ensure all tests pass:

   ```bash
   npm test
   ```

2. Update the version:

   ```bash
   npm version patch|minor|major
   ```

3. Publish to NPM (prepublishOnly script will build automatically):

   ```bash
   npm publish
   ```

4. Push the tag to GitHub:
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
